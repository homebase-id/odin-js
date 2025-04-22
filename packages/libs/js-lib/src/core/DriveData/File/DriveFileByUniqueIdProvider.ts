import { AxiosRequestConfig } from 'axios';

import { OdinClient } from '../../OdinClient';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptChunkedBytesResponse,
  decryptBytesResponse,
} from '../SecurityHelpers';
import {
  TargetDrive,
  SystemFileType,
  ContentType,
  ImageContentType,
  HomebaseFile,
} from './DriveFileTypes';
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

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile | null>>();

/// Get methods by UniqueId
export const getFileHeaderByUniqueId = async <T = string>(
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { systemFileType?: SystemFileType; decrypt?: boolean }
): Promise<HomebaseFile<T> | null> => {
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const fileHeader = await getFileHeaderBytesByUniqueId(odinClient, targetDrive, uniqueId, {
    decrypt,
    systemFileType,
  });
  if (!fileHeader) return null;

  const typedFileHeader: HomebaseFile<T> = {
    ...fileHeader,
    fileMetadata: {
      ...fileHeader.fileMetadata,
      appData: {
        ...fileHeader.fileMetadata.appData,
        content: decrypt
          ? tryJsonParse<T>(fileHeader.fileMetadata.appData.content)
          : (fileHeader.fileMetadata.appData.content as T),
      },
    },
  };

  return typedFileHeader;
};

export const getFileHeaderBytesByUniqueId = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile | null> => {
  assertIfDefined('OdinClient', odinClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = getCacheKey(targetDrive, uniqueId, !!decrypt);
  const cacheEntry =
    _internalMetadataPromiseCache.has(cacheKey) &&
    (await _internalMetadataPromiseCache.get(cacheKey));
  if (cacheEntry) return cacheEntry;

  const client = getAxiosClient(odinClient, systemFileType);

  const request: GetFileByUniqueIdRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
  };

  const promise: Promise<HomebaseFile | null> = client
    .get<HomebaseFile>('/drive/query/specialized/cuid/header?' + stringifyToQueryParams(request))
    .then((response) => response.data)
    .then(async (fileHeader) => {
      if (decrypt) {
        const keyheader = fileHeader.fileMetadata.isEncrypted
          ? await decryptKeyHeader(odinClient, fileHeader.sharedSecretEncryptedKeyHeader)
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
      console.error('[odin-js:getFileHeaderByUniqueId]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};

export const getPayloadAsJsonByUniqueId = async <T>(
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const systemFileType = options?.systemFileType ?? 'Standard';

  return getPayloadBytesByUniqueId(odinClient, targetDrive, uniqueId, key, {
    systemFileType,
    decrypt: true,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesByUniqueId = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt?: boolean;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('OdinClient', odinClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('Key', key);

  const { decrypt, systemFileType, chunkStart, chunkEnd, lastModified } = options || {
    decrypt: true,
    systemFileType: 'Standard',
  };

  const client = getAxiosClient(odinClient, systemFileType);
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
                odinClient,
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
            : await decryptBytesResponse(odinClient, response),

        contentType: `${response.headers.decryptedcontenttype}` as ContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[odin-js:getPayloadBytes]', error);
      return null;
    });
};

export const getThumbBytesByUniqueId = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  payloadKey: string,
  width: number,
  height: number,
  options?: {
    systemFileType?: SystemFileType;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null> => {
  assertIfDefined('OdinClient', odinClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('PayloadKey', payloadKey);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const lastModified = options?.lastModified ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const client = getAxiosClient(odinClient, systemFileType);
  const request: GetFileThumbByUniqueIdRequest = {
    ...targetDrive,
    clientUniqueId: uniqueId,
    payloadKey: payloadKey,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>(
      '/drive/query/specialized/cuid/thumb?' +
      stringifyToQueryParams({ ...request, width, height, lastModified }),
      config
    )
    .then(async (response) => {
      if (!response.data) return null;
      return {
        bytes: await decryptBytesResponse(odinClient, response),
        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[odin-js:getThumbBytes]', error);
      return null;
    });
};
