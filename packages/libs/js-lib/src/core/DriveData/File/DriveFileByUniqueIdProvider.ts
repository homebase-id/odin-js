import { AxiosRequestConfig } from 'axios';

import { DotYouClient } from '../../DotYouClient';
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
import { assertIfDefined, tryJsonParse } from '../../../helpers/DataUtil';
import {
  getAxiosClientV2,
  getCacheKey,
  getRangePath,
  parseBytesToObject,
  toV2QueryString,
} from './DriveFileHelper';

/// The V2 route of a file by its uniqueId; the drive is addressed by its id, which is the V1 alias
const byUniqueIdRoute = (targetDrive: TargetDrive, uniqueId: string) =>
  `/drives/${targetDrive.alias}/files/by-uid/${uniqueId}`;

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile | null>>();

/// Get methods by UniqueId
export const getFileHeaderByUniqueId = async <T = string>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { systemFileType?: SystemFileType; decrypt?: boolean }
): Promise<HomebaseFile<T> | null> => {
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const fileHeader = await getFileHeaderBytesByUniqueId(dotYouClient, targetDrive, uniqueId, {
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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = getCacheKey(targetDrive, uniqueId, !!decrypt);
  const cacheEntry =
    _internalMetadataPromiseCache.has(cacheKey) &&
    (await _internalMetadataPromiseCache.get(cacheKey));
  if (cacheEntry) return cacheEntry;

  const client = getAxiosClientV2(dotYouClient, systemFileType);

  const promise: Promise<HomebaseFile | null> = client
    .get<HomebaseFile>(`${byUniqueIdRoute(targetDrive, uniqueId)}/header`)
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
      console.error('[odin-js:getFileHeaderByUniqueId]', error);
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
  options?: {
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const systemFileType = options?.systemFileType ?? 'Standard';

  return getPayloadBytesByUniqueId(dotYouClient, targetDrive, uniqueId, key, {
    systemFileType,
    decrypt: true,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesByUniqueId = async (
  dotYouClient: DotYouClient,
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
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('Key', key);

  const { decrypt, systemFileType, chunkStart, chunkEnd, lastModified } = options || {
    decrypt: true,
    systemFileType: 'Standard',
  };

  // Payload reads take no shared secret: the path names the file, and lastModified (a cache buster) goes in clear
  const client = getAxiosClientV2(dotYouClient, systemFileType, { noSharedSecret: true });
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  // V2 ignores a Range header on payload/{key}; a partial read is the ranged route
  const { startOffset, updatedChunkStart, rangePath } = getRangePath(chunkStart, chunkEnd);

  return client
    .get<ArrayBuffer>(
      `${byUniqueIdRoute(targetDrive, uniqueId)}/payload/${key}${rangePath}` +
        toV2QueryString({ lastModified }),
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

export const getThumbBytesByUniqueId = async (
  dotYouClient: DotYouClient,
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
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);
  assertIfDefined('PayloadKey', payloadKey);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const lastModified = options?.lastModified ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  // by-uid has no path-based thumb size; width and height go in the (unencrypted) query string
  const client = getAxiosClientV2(dotYouClient, systemFileType, { noSharedSecret: true });
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>(
      `${byUniqueIdRoute(targetDrive, uniqueId)}/payload/${payloadKey}/thumb` +
        toV2QueryString({ width, height, lastModified }),
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
