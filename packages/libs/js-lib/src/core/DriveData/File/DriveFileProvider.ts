import { AxiosRequestConfig } from 'axios';
import { ContentType, HomebaseFile, EncryptedKeyHeader, SystemFileType } from './DriveFileTypes';
import { TargetDrive, ImageContentType, FileMetadata } from './DriveFileTypes';

import { DotYouClient } from '../../DotYouClient';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptChunkedBytesResponse,
  decryptBytesResponse,
} from '../SecurityHelpers';
import { getCacheKey, getAxiosClient, parseBytesToObject, getRangeHeader } from './DriveFileHelper';
import { assertIfDefined, stringifyToQueryParams, tryJsonParse } from '../../../helpers/DataUtil';
import { DEFAULT_PAYLOAD_KEY } from '../Upload/UploadHelpers';

interface GetFileRequest {
  alias: string;
  type: string;
  fileId: string;
}

interface GetFilePayloadRequest extends GetFileRequest {
  key: string;
}

interface GetFileThumbRequest extends GetFileRequest {
  payloadKey: string;
}

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile | null>>();

/// Get methods by FileId:
export const getFileHeader = async <T = string>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  options?: { systemFileType?: SystemFileType; decrypt?: boolean; axiosConfig?: AxiosRequestConfig }
): Promise<HomebaseFile<T> | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const { systemFileType, decrypt, axiosConfig } = options ?? {
    systemFileType: 'Standard',
    decrypt: true,
  };
  const fileHeader = await getFileHeaderBytes(dotYouClient, targetDrive, fileId, {
    decrypt,
    systemFileType,
    axiosConfig,
  });
  if (!fileHeader) return null;

  const typedFileHeader: HomebaseFile<T> = {
    ...fileHeader,
    fileMetadata: {
      ...fileHeader.fileMetadata,
      appData: {
        ...fileHeader.fileMetadata.appData,
        content: tryJsonParse<T>(fileHeader.fileMetadata.appData.content),
      },
    },
  };

  return typedFileHeader;
};

export const getFileHeaderBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  options:
    | { decrypt?: boolean; systemFileType?: SystemFileType; axiosConfig?: AxiosRequestConfig }
    | undefined
) => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = getCacheKey(targetDrive, fileId, decrypt);
  const cacheEntry =
    _internalMetadataPromiseCache.has(cacheKey) &&
    (await _internalMetadataPromiseCache.get(cacheKey));
  if (cacheEntry) return cacheEntry;

  const client = getAxiosClient(dotYouClient, systemFileType);

  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };

  const promise: Promise<HomebaseFile | null> = client
    .get<HomebaseFile>(
      '/drive/files/header?' + stringifyToQueryParams(request),
      options?.axiosConfig
    )
    .then((response) => response.data)
    .then(async (fileHeader) => {
      if (decrypt) {
        const keyheader = fileHeader.fileMetadata.isEncrypted
          ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
          : undefined;

        fileHeader.fileMetadata.appData.content = await decryptJsonContent(
          fileHeader.fileMetadata,
          keyheader
        );
      }
      _internalMetadataPromiseCache.delete(cacheKey);
      return fileHeader;
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[odin-js:getFileHeader]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};

export const getPayloadAsJson = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
    axiosConfig?: AxiosRequestConfig;
    lastModified?: number;
  }
): Promise<T | null> => {
  const { systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };
  return getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
    systemFileType,
    decrypt: true,
    axiosConfig: options?.axiosConfig,
    lastModified,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt?: boolean;
    lastModified?: number;
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Key', key);

  const { chunkStart, chunkEnd, lastModified } = options || {};
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFilePayloadRequest = {
    ...targetDrive,
    fileId,
    key,
  };

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
    ...options?.axiosConfig,
  };

  const { startOffset, updatedChunkStart, rangeHeader } = getRangeHeader(chunkStart, chunkEnd);
  config.headers = {
    ...config.headers,
    range: rangeHeader,
  };

  return client
    .get<ArrayBuffer>(
      '/drive/files/payload?' + stringifyToQueryParams({ ...request, lastModified }),
      config
    )
    .then(async (response) => {
      if (!response.data || !response.data.byteLength) return null;
      return {
        bytes: !decrypt
          ? new Uint8Array(response.data)
          : updatedChunkStart !== undefined
            ? (
                await decryptChunkedBytesResponse(
                  dotYouClient,
                  response,
                  startOffset,
                  updatedChunkStart
                )
              ).slice(
                0,
                chunkEnd !== undefined && chunkStart !== undefined
                  ? chunkEnd - chunkStart
                  : undefined
              )
            : await decryptBytesResponse(dotYouClient, response),

        contentType: `${response.headers.decryptedcontenttype}` as ContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[odin-js:getPayloadBytes]', error);
      return null;
    });
};

export const getThumbBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  payloadKey: string,
  width: number,
  height: number,
  options?: {
    systemFileType?: SystemFileType;
    lastModified?: number;
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('PayloadKey', payloadKey);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const { systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileThumbRequest = {
    ...targetDrive,
    fileId,
    payloadKey: payloadKey,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
    ...options?.axiosConfig,
  };

  return client
    .get<ArrayBuffer>(
      '/drive/files/thumb?' + stringifyToQueryParams({ ...request, width, height, lastModified }),
      config
    )
    .then(async (response) => {
      if (!response.data) return null;
      return {
        bytes: await decryptBytesResponse(dotYouClient, response),
        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[odin-js:getThumbBytes]', error);
      return null;
    });
};

export const getContentFromHeader = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader | undefined;
    fileSystemType?: SystemFileType;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
) => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;

  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader as EncryptedKeyHeader)
    : undefined;

  let decryptedJsonContent;
  if (includesJsonContent) {
    decryptedJsonContent = await decryptJsonContent(fileMetadata, keyHeader);
  } else {
    // When contentIsComplete but includesJsonContent == false the query before was done without including the content; So we just get and parse
    const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, {
      systemFileType: dsr.fileSystemType || systemFileType,
    });
    if (!fileHeader) return null;
    decryptedJsonContent = await decryptJsonContent(fileHeader.fileMetadata, keyHeader);
  }
  return tryJsonParse<T>(decryptedJsonContent, (ex) => {
    console.error(
      '[odin-js] getContentFromHeaderOrPayload: Error parsing JSON',
      ex && typeof ex === 'object' && 'stack' in ex ? ex.stack : ex,
      dsr.fileId,
      targetDrive
    );
  });
};

export const getContentFromHeaderOrPayload = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader | undefined;
    fileSystemType?: SystemFileType;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
): Promise<T | null> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  if (!fileId || !fileMetadata) {
    throw new Error('[odin-js] getContentFromHeaderOrPayload: fileId or fileMetadata is undefined');
  }

  const contentIsComplete =
    fileMetadata.payloads?.filter((payload) => payload.key === DEFAULT_PAYLOAD_KEY).length === 0;
  if (fileMetadata.isEncrypted && !sharedSecretEncryptedKeyHeader) return null;

  if (contentIsComplete) {
    return getContentFromHeader<T>(
      dotYouClient,
      targetDrive,
      dsr,
      includesJsonContent,
      systemFileType
    );
  } else {
    const payloadDescriptor = dsr.fileMetadata.payloads?.find(
      (payload) => payload.key === DEFAULT_PAYLOAD_KEY
    );
    return await getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, DEFAULT_PAYLOAD_KEY, {
      systemFileType: dsr.fileSystemType || systemFileType,
      lastModified: payloadDescriptor?.lastModified,
    });
  }
};
