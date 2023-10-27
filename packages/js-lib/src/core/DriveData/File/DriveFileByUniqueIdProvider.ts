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
  typedFileHeader.fileMetadata.appData.jsonContent = tryJsonParse<T>(
    fileHeader.fileMetadata.appData.jsonContent
  );

  return typedFileHeader;
};

export const getFileHeaderBytesByUniqueId = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options: { decrypt?: boolean; systemFileType?: SystemFileType } | undefined
): Promise<DriveSearchResult | null> => {
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
        const keyheader = fileHeader.fileMetadata.payloadIsEncrypted
          ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
          : undefined;

        fileHeader.fileMetadata.appData.jsonContent = await decryptJsonContent(
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
  options: {
    keyHeader?: KeyHeader | EncryptedKeyHeader;
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const { keyHeader, systemFileType } = options ?? { systemFileType: 'Standard' };
  return getPayloadBytesByUniqueId(dotYouClient, targetDrive, uniqueId, {
    keyHeader,
    systemFileType,
    decrypt: true,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesByUniqueId = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options: {
    keyHeader?: KeyHeader | EncryptedKeyHeader;
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt?: boolean;
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);

  const { keyHeader, chunkStart, chunkEnd } = options;
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileByUniqueIdRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
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
      '/drive/query/specialized/cuid/payload?' + stringifyToQueryParams(request as any),
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

        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
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
  keyHeader: KeyHeader | undefined,
  width: number,
  height: number,
  systemFileType?: SystemFileType
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType } | null> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const client = getAxiosClient(dotYouClient, systemFileType);
  const request: GetFileByUniqueIdRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>(
      '/drive/files/thumb?' + stringifyToQueryParams({ ...request, width, height }),
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
