import { AxiosRequestConfig } from 'axios';
import {
  ContentType,
  DriveSearchResult,
  EncryptedKeyHeader,
  KeyHeader,
  SystemFileType,
} from './DriveFileTypes';
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

const _internalMetadataPromiseCache = new Map<string, Promise<DriveSearchResult | null>>();

/// Get methods by FileId:
export const getFileHeader = async <T = string>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  options?: { systemFileType?: SystemFileType }
): Promise<DriveSearchResult<T> | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const { systemFileType } = options ?? { systemFileType: 'Standard' };
  const fileHeader = await getFileHeaderBytes(dotYouClient, targetDrive, fileId, {
    decrypt: true,
    systemFileType,
  });
  if (!fileHeader) return null;

  const typedFileHeader = fileHeader as DriveSearchResult<T>;
  typedFileHeader.fileMetadata.appData.content = tryJsonParse<T>(
    fileHeader.fileMetadata.appData.content
  );

  return typedFileHeader;
};

export const getFileHeaderBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  options: { decrypt?: boolean; systemFileType?: SystemFileType } | undefined
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

  const promise: Promise<DriveSearchResult | null> = client
    .get<DriveSearchResult>('/drive/files/header?' + stringifyToQueryParams(request as any))
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
      console.error('[DotYouCore-js:getFileHeader]', error);
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
  options: {
    keyHeader: KeyHeader | EncryptedKeyHeader | undefined;
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const { keyHeader, systemFileType } = options ?? { systemFileType: 'Standard' };
  return getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
    keyHeader,
    systemFileType,
    decrypt: true,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  options: {
    keyHeader?: KeyHeader | EncryptedKeyHeader;
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt?: boolean;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Key', key);

  const { keyHeader, chunkStart, chunkEnd, lastModified } = options;
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
      if (!response.data) return null;
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
                ? chunkEnd - chunkStart + 1
                : undefined
            )
          : await decryptBytesResponse(dotYouClient, response, keyHeader),

        contentType: `${response.headers.decryptedcontenttype}` as ContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[DotYouCore-js:getPayloadBytes]', error);
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
  options: { keyHeader?: KeyHeader; systemFileType?: SystemFileType; lastModified?: number }
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('PayloadKey', payloadKey);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const { keyHeader, systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileThumbRequest = {
    ...targetDrive,
    fileId,
    payloadKey: payloadKey,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>(
      '/drive/files/thumb?' + stringifyToQueryParams({ ...request, width, height, lastModified }),
      config
    )
    .then(async (response) => {
      if (!response.data) return null;
      return {
        bytes: await decryptBytesResponse(dotYouClient, response, keyHeader),
        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[DotYouCore-js:getThumbBytes]', error);
      return null;
    });
};

export const getContentFromHeaderOrPayload = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader | undefined;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
): Promise<T | null> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  const contentIsComplete =
    fileMetadata.payloads.filter((payload) => payload.contentType === 'application/json').length ===
    0;
  if (fileMetadata.isEncrypted && !sharedSecretEncryptedKeyHeader) return null;

  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader as EncryptedKeyHeader)
    : undefined;

  if (contentIsComplete) {
    let decryptedJsonContent;
    if (includesJsonContent) {
      decryptedJsonContent = await decryptJsonContent(fileMetadata, keyHeader);
    } else {
      // When contentIsComplete but includesJsonContent == false the query before was done without including the content; So we just get and parse
      const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
      if (!fileHeader) return null;
      decryptedJsonContent = await decryptJsonContent(fileHeader.fileMetadata, keyHeader);
    }
    return tryJsonParse<T>(decryptedJsonContent);
  } else {
    return await getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, DEFAULT_PAYLOAD_KEY, {
      keyHeader,
      systemFileType,
    });
  }
};
