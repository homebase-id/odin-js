import { AxiosRequestConfig } from 'axios';

import { DotYouClient } from '../../DotYouClient';
import { DriveSearchResult, KeyHeader, EncryptedKeyHeader } from '../Drive/DriveTypes';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptChunkedBytesResponse,
  decryptBytesResponse,
} from '../SecurityHelpers';
import { TargetDrive, SystemFileType, ContentType, ImageContentType } from './DriveFileTypes';
import { assertIfDefined, stringifyToQueryParams, tryJsonParse } from '../../../helpers/DataUtil';
import { getAxiosClient, getCacheKey, getRangeHeader, parseBytesToObject } from './DriveFileHelper';

interface GetFileByUniqueIdRequest {
  alias: string;
  type: string;
  clientUniqueId: string;
}

interface GetFileByUniqueIdPayloadRequest extends GetFileByUniqueIdRequest {
  key: string;
}
interface GetFileThumbByUniqueIdRequest extends GetFileByUniqueIdRequest {
  payloadKey: string;
}

const _internalMetadataPromiseCache = new Map<string, Promise<DriveSearchResult | null>>();

/// Get methods by UniqueId
export const getFileHeaderByUniqueId = async <T = string>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { systemFileType?: SystemFileType }
): Promise<DriveSearchResult<T> | null> => {
  const { systemFileType } = options ?? { systemFileType: 'Standard' };
  const fileHeader = await getFileHeaderBytesByUniqueId(dotYouClient, targetDrive, uniqueId, {
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

export const getFileHeaderBytesByUniqueId = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options: { decrypt?: boolean; systemFileType?: SystemFileType } | undefined
): Promise<DriveSearchResult | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = getCacheKey(targetDrive, uniqueId, decrypt);
  const cacheEntry =
    _internalMetadataPromiseCache.has(cacheKey) &&
    (await _internalMetadataPromiseCache.get(cacheKey));
  if (cacheEntry) return cacheEntry;

  const client = getAxiosClient(dotYouClient, systemFileType);

  const request: GetFileByUniqueIdRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
  };

  const promise: Promise<DriveSearchResult | null> = client
    .get<DriveSearchResult>(
      '/drive/query/specialized/cuid/header?' + stringifyToQueryParams(request as any)
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
      console.error('[DotYouCore-js:getFileHeaderByUniqueId]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};

export const getPayloadAsJsonByUniqueId = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  key: string,
  options: {
    keyHeader?: KeyHeader | EncryptedKeyHeader;
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const { keyHeader, systemFileType } = options ?? { systemFileType: 'Standard' };
  return getPayloadBytesByUniqueId(dotYouClient, targetDrive, uniqueId, key, {
    keyHeader,
    systemFileType,
    decrypt: true,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesByUniqueId = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
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
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('Key', key);

  const { keyHeader, chunkStart, chunkEnd, lastModified } = options;
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileByUniqueIdPayloadRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
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
      '/drive/query/specialized/cuid/payload?' +
        stringifyToQueryParams({ ...request, lastModified }),
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

export const getThumbBytesByUniqueId = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  key: string,
  width: number,
  height: number,
  options: {
    keyHeader: KeyHeader | undefined;
    systemFileType?: SystemFileType;
    lastModified?: number;
  }
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('Key', key);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const { keyHeader, systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };
  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileThumbByUniqueIdRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
    payloadKey: key,
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
