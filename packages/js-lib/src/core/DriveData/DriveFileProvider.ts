import { AxiosRequestConfig } from 'axios';
import {
  stringify,
  byteArrayToString,
  roundToSmallerMultipleOf16,
  roundToLargerMultipleOf16,
  assertIfDefined,
} from '../../helpers/DataUtil';
import { DotYouClient } from '../DotYouClient';
import { DriveSearchResult, KeyHeader, EncryptedKeyHeader } from './DriveTypes';
import { SystemFileType } from './DriveFileTypes';
import {
  decryptChunkedBytesResponse,
  decryptBytesResponse,
  decryptKeyHeader,
  decryptJsonContent,
} from './SecurityHelpers';
import { TargetDrive, ImageContentType, FileMetadata } from './DriveFileTypes';

interface GetFileRequest {
  alias: string;
  type: string;
  fileId: string;
}

interface GetPayloadRequest extends GetFileRequest {
  chunkStart?: number;
  chunkLength?: number;
}

const _internalMetadataPromiseCache = new Map<string, Promise<DriveSearchResult | null>>();

/// Get methods:
export const getFileHeader = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<DriveSearchResult | null> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const cacheKey = `${targetDrive.alias}-${targetDrive.type}+${fileId}`;
  if (_internalMetadataPromiseCache.has(cacheKey)) {
    const cacheEntry = await _internalMetadataPromiseCache.get(cacheKey);
    if (cacheEntry) return cacheEntry;
  }

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };

  const promise: Promise<DriveSearchResult | null> = client
    .get('/drive/files/header?' + stringify(request))
    .then((response) => {
      _internalMetadataPromiseCache.delete(cacheKey);
      return response.data;
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
  keyHeader: KeyHeader | EncryptedKeyHeader | undefined,
  systemFileType?: SystemFileType
): Promise<T | null> => {
  return getPayloadBytes(dotYouClient, targetDrive, fileId, keyHeader, systemFileType).then(
    (data) => {
      if (!data) return null;
      const json = byteArrayToString(new Uint8Array(data.bytes));
      try {
        const o = JSON.parse(json);
        return o;
      } catch (ex) {
        console.warn('base JSON.parse failed');
        const replaceAll = (str: string, find: string, replace: string) => {
          return str.replace(new RegExp(find, 'g'), replace);
        };

        const jsonWithRemovedQuote = replaceAll(json, '\u0019', '');
        const jsonWithRemovedEmDash = replaceAll(jsonWithRemovedQuote, '\u0014', '');

        const o = JSON.parse(jsonWithRemovedEmDash);

        console.warn('... but we fixed it');
        return o;
      }
    }
  );
};

export const getPayloadBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | EncryptedKeyHeader | undefined,
  systemFileType?: SystemFileType,
  chunkStart?: number,
  chunkLength?: number
): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });
  const request: GetPayloadRequest = {
    ...targetDrive,
    fileId,
  };

  let startOffset = 0;
  if (chunkStart !== undefined) {
    request.chunkStart = chunkStart === 0 ? 0 : roundToSmallerMultipleOf16(chunkStart - 16);
    startOffset = Math.abs(chunkStart - request.chunkStart);

    if (chunkLength !== undefined) {
      request.chunkLength = roundToLargerMultipleOf16(chunkLength + startOffset);
    }
  }

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>('/drive/files/payload?' + stringify(request), config)
    .then(async (response) => {
      return {
        bytes:
          request.chunkStart !== undefined
            ? (
                await decryptChunkedBytesResponse(
                  dotYouClient,
                  response,
                  startOffset,
                  request.chunkStart
                )
              ).slice(0, chunkLength)
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

export const getThumbBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined,
  width: number,
  height: number,
  systemFileType?: SystemFileType
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType } | null> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });
  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get<ArrayBuffer>('/drive/files/thumb?' + stringify({ ...request, width, height }), config)
    .then(async (response) => {
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

/// Delete methods:

export const deleteFile = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  deleteLinkedFiles?: boolean,
  recipients?: string[],
  systemFileType?: SystemFileType
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    deleteLinkedFiles: deleteLinkedFiles ?? true,
    recipients: recipients,
  };

  return client
    .post('/drive/files/delete', request)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};

export const deleteThumbnail = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  width: number,
  height: number,
  systemFileType?: SystemFileType
) => {
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    width,
    height,
  };

  client
    .post('/attachments/deletethumbnail', request)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};

export const deletePayload = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  width: number,
  height: number,
  systemFileType?: SystemFileType
) => {
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request = {
    key: '', // TODO: Add key (reference to a key for multiple payloads in a single file)
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  client
    .post('/attachments/deletepayload', request)
    .then((response) => response.status === 200)
    .catch((error) => {
      console.error('[DotYouCore-js:deleteFile]', error);
      throw error;
    });
};

/// Helper methods:
export const getPayload = async <T>(
  dotYouClient: DotYouClient,
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

  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader)
    : undefined;

  if (fileMetadata.appData.contentIsComplete && includesJsonContent) {
    return await decryptJsonContent<T>(fileMetadata, keyheader);
  } else if (fileMetadata.appData.contentIsComplete) {
    // When contentIsComplete but !includesJsonContent the query before was done without including the jsonContent; So we just get and parse
    const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, systemFileType);
    if (!fileHeader) return null;
    return await decryptJsonContent<T>(fileHeader.fileMetadata, keyheader);
  } else {
    return await getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, keyheader, systemFileType);
  }
};
