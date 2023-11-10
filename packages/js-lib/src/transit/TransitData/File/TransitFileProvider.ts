import { AxiosRequestConfig } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptChunkedBytesResponse,
  decryptBytesResponse,
} from '../../../core/DriveData/SecurityHelpers';
import { DEFAULT_PAYLOAD_KEY } from '../../../core/DriveData/Upload/UploadHelpers';
import {
  TargetDrive,
  DriveSearchResult,
  FileMetadata,
  EncryptedKeyHeader,
  KeyHeader,
  SystemFileType,
  ImageContentType,
  ContentType,
} from '../../../core/core';
import { assertIfDefined, tryJsonParse, stringifyToQueryParams } from '../../../helpers/DataUtil';
import {
  getAxiosClient,
  getRangeHeader,
  parseBytesToObject,
} from '../../../core/DriveData/File/DriveFileHelper';

interface GetFileRequest {
  odinId: string;

  alias: string;
  type: string;
  fileId: string;
}

interface GetPayloadRequest extends GetFileRequest {
  key: string;
}

interface GetThumbRequest extends GetFileRequest {
  payloadKey: string;
}

const _internalMetadataPromiseCache = new Map<string, Promise<DriveSearchResult>>();

export const getPayloadAsJsonOverTransit = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  options: {
    keyHeader: KeyHeader | EncryptedKeyHeader | undefined;
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const { keyHeader, systemFileType } = options ?? { systemFileType: 'Standard' };

  return getPayloadBytesOverTransit(dotYouClient, odinId, targetDrive, fileId, key, {
    keyHeader,
    systemFileType,
    decrypt: true,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
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
  assertIfDefined('OdinId', odinId);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Key', key);

  const { keyHeader, chunkStart, chunkEnd, lastModified } = options;
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetPayloadRequest = {
    odinId: odinId,
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
      '/transit/query/payload?' + stringifyToQueryParams({ ...request, lastModified }),
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
      console.error('[DotYouCore-js:getPayloadBytesOverTransit]', error);
      return null;
    });
};

export const getThumbBytesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  width: number,
  height: number,
  options: {
    keyHeader?: KeyHeader;
    systemFileType?: SystemFileType;
    lastModified?: number;
  }
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType } | null> => {
  assertIfDefined('OdinId', odinId);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Key', key);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const { keyHeader, systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetThumbRequest = {
    odinId: odinId,
    ...targetDrive,
    payloadKey: key,
    fileId,
  };

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>(
      '/transit/query/thumb?' + stringifyToQueryParams({ ...request, width, height, lastModified }),
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

export const getFileHeaderOverTransit = async <T = string>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  options?: { systemFileType?: SystemFileType }
): Promise<DriveSearchResult<T> | null> => {
  const { systemFileType } = options ?? { systemFileType: 'Standard' };
  const fileHeader = await getFileHeaderBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    {
      decrypt: true,
      systemFileType,
    }
  );
  if (!fileHeader) return null;

  const typedFileHeader = fileHeader as DriveSearchResult<T>;
  typedFileHeader.fileMetadata.appData.content = tryJsonParse<T>(
    fileHeader.fileMetadata.appData.content
  );

  return typedFileHeader;
};

export const getFileHeaderBytesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  options: { decrypt?: boolean; systemFileType?: SystemFileType } | undefined
): Promise<DriveSearchResult> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('OdinId', odinId);
  assertIfDefined('FileId', fileId);
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = `${odinId}+${targetDrive.alias}-${targetDrive.type}+${fileId}+${decrypt}`;
  if (_internalMetadataPromiseCache.has(cacheKey)) {
    const cacheData = await _internalMetadataPromiseCache.get(cacheKey);
    if (cacheData) return cacheData;
  }

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileRequest = {
    odinId: odinId,
    fileId,
    ...targetDrive,
  };

  const promise = client
    .get('/transit/query/header?' + stringifyToQueryParams(request as any))
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
      console.error('[DotYouCore-js:getFileHeaderBytesOverTransit]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};

export const getContentFromHeaderOrPayloadOverTransit = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
): Promise<T | null> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  const contentIsComplete =
    fileMetadata.payloads.filter((payload) => payload.contentType === 'application/json').length ===
    0;
  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader)
    : undefined;

  if (contentIsComplete) {
    let decryptedJsonContent;
    if (includesJsonContent) {
      decryptedJsonContent = await decryptJsonContent(fileMetadata, keyHeader);
    } else {
      // When contentIsComplete but includesJsonContent == false the query before was done without including the content; So we just get and parse
      const fileHeader = await getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId, {
        systemFileType,
      });
      if (!fileHeader) return null;
      decryptedJsonContent = await decryptJsonContent(fileHeader.fileMetadata, keyHeader);
    }
    return tryJsonParse<T>(decryptedJsonContent);
  } else {
    return await getPayloadAsJsonOverTransit<T>(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      DEFAULT_PAYLOAD_KEY,
      {
        keyHeader,
      }
    );
  }
};
