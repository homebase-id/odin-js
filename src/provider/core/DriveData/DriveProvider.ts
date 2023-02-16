import {
  KeyHeader,
  DriveDefinition,
  TargetDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  GetModifiedResultOptions,
  QueryBatchResponse,
  QueryModifiedResponse,
  DriveSearchResult,
  EncryptedKeyHeader,
  FileMetadata,
  QueryBatchCollectionResponse,
  ThumbnailFileTypes,
} from './DriveTypes';
import { AxiosRequestConfig } from 'axios';
import { PagedResult, PagingOptions } from '../Types';
import {
  UploadFileDescriptor,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from './DriveUploadTypes';
import { ApiType, DotYouClient } from '../DotYouClient';
import { cbcEncrypt, cbcDecrypt } from '../AesEncrypt';
import {
  stringify,
  byteArrayToString,
  splitSharedSecretEncryptedKeyHeader,
  base64ToUint8Array,
  uint8ArrayToBase64,
  stringToUint8Array,
  jsonStringify64,
} from '../DataUtil';

interface GetModifiedRequest {
  queryParams: FileQueryParams;
  resultOptions: GetModifiedResultOptions;
}

interface GetBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
}

interface GetFileRequest {
  alias: string;
  type: string;
  fileId: string;
}

const EMPTY_KEY_HEADER: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(0)),
  aesKey: new Uint8Array(Array(16).fill(0)),
};

const _internalMetadataCache = new Map<string, Promise<DriveSearchResult>>();

const assertIfDefined = (key: string, value: unknown) => {
  if (!value) {
    throw new Error(`${key} undefined`);
  }
};

export const DEFAULT_QUERY_MODIFIED_RESULT_OPTION = {
  cursor: undefined,
  maxRecords: 10,
  includeJsonContent: true,
  excludePreviewThumbnail: false,
};

export const DEFAULT_QUERY_BATCH_RESULT_OPTION = {
  cursorState: undefined,
  maxRecords: 10,
  includeMetadataHeader: true,
};

export const getDrives = async (
  dotYouClient: DotYouClient,
  params: PagingOptions
): Promise<PagedResult<DriveDefinition>> => {
  const client = dotYouClient.createAxiosClient();

  return client.post('drive/mgmt', params).then((response) => {
    return response.data;
  });
};

/// Drive methods:
//returns all drives for a given type
export const getDrivesByType = async (
  dotYouClient: DotYouClient,
  type: string,
  pageNumber: number,
  pageSize: number
): Promise<PagedResult<DriveDefinition>> => {
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
  };

  if (dotYouClient.getType() === ApiType.Owner) {
    // Post needed
    const client = dotYouClient.createAxiosClient();
    return client.post('drive/mgmt/type', params).then((response) => {
      return response.data;
    });
  } else {
    const client = dotYouClient.createAxiosClient();
    return client.get('drive/metadata/type?' + stringify(params)).then((response) => {
      return {
        ...response.data,
        results: response?.data?.results?.map((result: { targetDrive: any }) => {
          return { ...result, targetDriveInfo: result.targetDrive };
        }),
      };
    });
  }
};

export const ensureDrive = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  name: string,
  metadata: string,
  allowAnonymousReads: boolean,
  allowSubscriptions = false
): Promise<boolean> => {
  //create the drive if it does not exist
  const client = dotYouClient.createAxiosClient();
  const allDrives = await getDrives(dotYouClient, { pageNumber: 1, pageSize: 1000 });

  const foundDrive = allDrives.results.find(
    (d) =>
      d.targetDriveInfo.alias == targetDrive.alias && d.targetDriveInfo.type == targetDrive.type
  );

  if (foundDrive) {
    return true;
  }

  const data = {
    name: name,
    targetDrive: targetDrive,
    metadata: metadata,
    allowAnonymousReads: allowAnonymousReads,
    allowSubscriptions: allowSubscriptions,
  };

  return client
    .post('/drive/mgmt/create', data)
    .then((response) => {
      if (response.status === 200) {
        return true;
      }

      return false;
    })
    .catch((error) => {
      console.error('[DotYouCore-js]', error);
      throw error;
    });
};

/// Query methods:
export const queryModified = async (
  dotYouClient: DotYouClient,
  params: FileQueryParams,
  ro?: GetModifiedResultOptions
): Promise<QueryModifiedResponse> => {
  const client = dotYouClient.createAxiosClient();

  const request: GetModifiedRequest = {
    queryParams: params,
    resultOptions: ro ?? DEFAULT_QUERY_MODIFIED_RESULT_OPTION,
  };

  return client.post<QueryModifiedResponse>('/drive/query/modified', request).then((response) => {
    return response.data;
  });
};

export const queryBatch = async (
  dotYouClient: DotYouClient,
  params: FileQueryParams,
  ro?: GetBatchQueryResultOptions
): Promise<QueryBatchResponse> => {
  const client = dotYouClient.createAxiosClient();

  const request: GetBatchRequest = {
    queryParams: params,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
  };

  return client.post<QueryBatchResponse>('/drive/query/batch', request).then((response) => {
    const responseData = response.data;
    return {
      ...response.data,
      // Remove deleted files
      searchResults: responseData.searchResults.filter((dsr) => dsr.fileState === 'active'),
    };
  });
};

export const queryBatchCollection = async (
  dotYouClient: DotYouClient,
  queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions;
  }[]
): Promise<QueryBatchCollectionResponse> => {
  const client = dotYouClient.createAxiosClient();

  const updatedQueries = queries.map((query) => {
    const ro = query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION;
    return {
      ...query,
      resultOptions: {
        maxRecords: ro.maxRecords,
        includeJsonContent: ro.includeMetadataHeader,
        excludePreviewThumbnail: !ro.includeMetadataHeader,
        cursor: ro.cursorState,
      },
    };
  });

  return client
    .post<QueryBatchCollectionResponse>('/drive/query/batchcollection', {
      queries: updatedQueries,
    })
    .then((response) => {
      return {
        ...response.data,
        // Remove deleted files
        results: response.data.results.map((result) => {
          return {
            ...result,
            searchResults: result.searchResults.filter((dsr) => dsr.fileState === 'active'),
          };
        }),
      };
    });
};

/// Get methods:

export const getFileHeader = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<DriveSearchResult> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const cacheKey = `${targetDrive.alias}-${targetDrive.type}+${fileId}`;
  if (_internalMetadataCache.has(cacheKey)) {
    const cacheEntry = await _internalMetadataCache.get(cacheKey);
    if (cacheEntry) return cacheEntry;
  }

  const client = dotYouClient.createAxiosClient();

  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };

  const promise = client
    .get('/drive/files/header?' + stringify(request))
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error.response?.status === 404) {
        return undefined;
      } else {
        console.error('[DotYouCore-js]', error);
        throw error;
      }
    });

  _internalMetadataCache.set(cacheKey, promise);

  return promise;
};

export const getPayloadAsJson = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined
): Promise<T> => {
  return getPayloadBytes(dotYouClient, targetDrive, fileId, keyHeader).then((data) => {
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
  });
};

export const getPayloadBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined
): Promise<{ bytes: ArrayBuffer; contentType: string }> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient();
  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get('/drive/files/payload?' + stringify(request), config)
    .then(async (response) => {
      if (keyHeader) {
        const cipher = new Uint8Array(response.data);
        return decryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
          return {
            bytes,
            contentType: `${response.headers.decryptedcontenttype}`,
          };
        });
      } else if (
        response.headers.payloadencrypted === 'True' &&
        response.headers.sharedsecretencryptedheader64
      ) {
        const encryptedKeyHeader = splitSharedSecretEncryptedKeyHeader(
          response.headers.sharedsecretencryptedheader64
        );

        const keyHeader = await decryptKeyHeader(dotYouClient, encryptedKeyHeader);
        const cipher = new Uint8Array(response.data);

        const bytes = await decryptUsingKeyHeader(cipher, keyHeader);
        return { bytes, contentType: `${response.headers.decryptedcontenttype}` };
      } else {
        return {
          bytes: new Uint8Array(response.data),
          contentType: `${response.headers.decryptedcontenttype}`,
        };
      }
    })
    .catch((error) => {
      console.error('[DotYouCore-js]', error);
      throw error;
    });
};

export const getThumbBytes = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined,
  width: number,
  height: number
): Promise<{ bytes: ArrayBuffer; contentType: string }> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);

  const client = dotYouClient.createAxiosClient();
  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };
  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .get('/drive/files/thumb?' + stringify({ ...request, width, height }), config)
    .then(async (response) => {
      if (keyHeader) {
        const cipher = new Uint8Array(response.data);
        return decryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
          return {
            bytes,
            contentType: `${response.headers.decryptedcontenttype}`,
          };
        });
      } else if (
        response.headers.payloadencrypted === 'True' &&
        response.headers.sharedsecretencryptedheader64
      ) {
        const encryptedKeyHeader = splitSharedSecretEncryptedKeyHeader(
          response.headers.sharedsecretencryptedheader64
        );

        const keyHeader = await decryptKeyHeader(dotYouClient, encryptedKeyHeader);
        const cipher = new Uint8Array(response.data);

        const bytes = await decryptUsingKeyHeader(cipher, keyHeader);
        return { bytes, contentType: `${response.headers.decryptedcontenttype}` };
      } else {
        return {
          bytes: new Uint8Array(response.data),
          contentType: `${response.headers.decryptedcontenttype}`,
        };
      }
    })
    .catch((error) => {
      console.error('[DotYouCore-js]', error);
      throw error;
    });
};

export const decryptJsonContent = async <T>(
  fileMetaData: FileMetadata,
  keyheader: KeyHeader | undefined
): Promise<T> => {
  if (keyheader) {
    try {
      const cipher = base64ToUint8Array(fileMetaData.appData.jsonContent);
      const json = byteArrayToString(await decryptUsingKeyHeader(cipher, keyheader));

      return JSON.parse(json);
    } catch (err) {
      console.error('[DotYouCore-js]', 'Json Content Decryption failed. Trying to only parse JSON');
    }
  }

  return JSON.parse(fileMetaData.appData.jsonContent);
};

/// Delete methods:

export const deleteFile = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  deleteLinkedFiles?: boolean,
  recipients?: string[]
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient();

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
      console.error('[DotYouCore-js]', error);
      throw error;
    });
};

// This is a temporary method, and should only be used as long as there is no way to fully remove all files on a drive in one go
export const purgeAllFiles = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive
): Promise<boolean> => {
  assertIfDefined('TargetDrive', targetDrive);

  const includeMetadataHeader = true;
  const pageSize = 10;
  const maxPages = 10;

  const getAllFilesOnDrive = async (drive: TargetDrive) => {
    const querySet = async (cursorState: string | undefined): Promise<QueryBatchResponse> => {
      return await queryBatch(
        dotYouClient,
        { targetDrive: drive },
        {
          maxRecords: pageSize,
          includeMetadataHeader: includeMetadataHeader,
          cursorState: cursorState,
        }
      );
    };

    const searchResults: DriveSearchResult[] = [];
    let cursorState: string | undefined = undefined;

    for (let i = 0; i < maxPages; i++) {
      const response: QueryBatchResponse = await querySet(cursorState);
      searchResults.push(...response.searchResults);
      cursorState = response.cursorState;

      if (response.searchResults.length < pageSize) {
        break;
      }
    }

    return searchResults;
  };

  const searchResults = await getAllFilesOnDrive(targetDrive);

  const purgeFile = (targetDrive: TargetDrive, fileId: string): Promise<boolean | void> => {
    assertIfDefined('TargetDrive', targetDrive);
    assertIfDefined('FileId', fileId);

    const client = dotYouClient.createAxiosClient();

    const request = {
      file: {
        targetDrive: targetDrive,
        fileId: fileId,
      },
      deleteLinkedFiles: true,
    };

    return client
      .post('/drive/files/harddelete', request)
      .then((response) => {
        if (response.status === 200) {
          return true;
        }

        return false;
      })
      .catch((error) => {
        console.error('[DotYouCore-js]', error);
        throw error;
      });
  };

  await Promise.all(
    searchResults.map(async (result) => await purgeFile(targetDrive, result.fileId))
  );

  return true;
};

/// Upload methods:

export const uploadUsingKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payload: Uint8Array,
  thumbnails?: { filename: string; payload: Uint8Array; contentType: ThumbnailFileTypes }[]
): Promise<UploadResult> => {
  const encryptedMetaData = keyHeader
    ? {
        ...metadata,
        appData: {
          ...metadata.appData,
          jsonContent: metadata.appData.jsonContent
            ? uint8ArrayToBase64(
                await encryptWithKeyheader(
                  stringToUint8Array(metadata.appData.jsonContent),
                  keyHeader
                )
              )
            : null,
        },
      }
    : metadata;

  const descriptor: UploadFileDescriptor = {
    encryptedKeyHeader: await encryptKeyHeader(
      dotYouClient,
      keyHeader ?? EMPTY_KEY_HEADER,
      instructions.transferIv
    ),
    fileMetadata: encryptedMetaData,
  };

  const encryptedDescriptor = await encryptWithSharedSecret(
    dotYouClient,
    descriptor,
    instructions.transferIv
  );
  const encryptedPayload = keyHeader ? await encryptWithKeyheader(payload, keyHeader) : payload;

  const data = new FormData();
  data.append('instructions', toBlob(instructions));
  data.append('metaData', new Blob([encryptedDescriptor]));

  if (metadata.appData.contentIsComplete) {
    data.append('payload', new Blob([]));
  } else {
    data.append('payload', new Blob([encryptedPayload]));
  }

  if (thumbnails) {
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      const thumbnailBytes = keyHeader
        ? await encryptWithKeyheader(thumb.payload, keyHeader)
        : thumb.payload;
      data.append(
        'thumbnail',
        new Blob([thumbnailBytes], {
          type: thumb.contentType,
        }),
        thumb.filename
      );
    }
  }

  const client = dotYouClient.createAxiosClient(true);
  const url = '/drive/files/upload';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
    },
  };

  return client
    .post(url, data, config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error('[DotYouCore-js]', error);
      throw error;
    });
};

export const uploadFile = async (
  dotYouClient: DotYouClient,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payload: Uint8Array,
  thumbnails?: { filename: string; payload: Uint8Array; contentType: ThumbnailFileTypes }[],
  encrypt = true
): Promise<UploadResult> => {
  const keyHeader = encrypt ? GenerateKeyHeader() : undefined;
  return uploadUsingKeyHeader(dotYouClient, keyHeader, instructions, metadata, payload, thumbnails);
};

/// Upload helpers:

const encryptWithKeyheader = async (
  content: Uint8Array,
  keyHeader: KeyHeader
): Promise<Uint8Array> => {
  const cipher = await cbcEncrypt(content, keyHeader.iv, keyHeader.aesKey);
  return cipher;
};

const encryptWithSharedSecret = async (
  dotYouClient: DotYouClient,
  o: any,
  iv: Uint8Array
): Promise<Uint8Array> => {
  //encrypt metadata with shared secret
  const ss = dotYouClient.getSharedSecret();
  const json = jsonStringify64(o);

  if (!ss) {
    throw new Error('attempting to decrypt but missing the shared secret');
  }

  const content = new TextEncoder().encode(json);
  const cipher = await cbcEncrypt(content, iv, ss);
  return cipher;
};

const toBlob = (o: any): Blob => {
  const json = jsonStringify64(o);
  const content = new TextEncoder().encode(json);
  return new Blob([content]);
};

/// Helper methods:
export const getPayload = async <T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  fileMetadata: FileMetadata,
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader,
  includesJsonContent: boolean
): Promise<T> => {
  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader)
    : undefined;

  if (fileMetadata.appData.contentIsComplete && includesJsonContent) {
    return await decryptJsonContent<T>(fileMetadata, keyheader);
  } else if (fileMetadata.appData.contentIsComplete) {
    // When contentIsComplete but !includesJsonContent the query before was done without including the jsonContent; So we just get and parse
    const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId);
    return await decryptJsonContent<T>(fileHeader.fileMetadata, keyheader);
  } else {
    return await getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, keyheader);
  }
};

export const decryptUsingKeyHeader = async (
  cipher: Uint8Array,
  keyHeader: KeyHeader
): Promise<Uint8Array> => {
  return await cbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
};

export const decryptKeyHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader
): Promise<KeyHeader> => {
  const ss = dotYouClient.getSharedSecret();
  if (!ss) {
    throw new Error('attempting to decrypt but missing the shared secret');
  }

  // Check if used params aren't still base64 encoded if so parse to bytearrays
  let encryptedAesKey = encryptedKeyHeader.encryptedAesKey;
  if (typeof encryptedKeyHeader.encryptedAesKey === 'string') {
    encryptedAesKey = base64ToUint8Array(encryptedKeyHeader.encryptedAesKey);
  }

  let receivedIv = encryptedKeyHeader.iv;
  if (typeof encryptedKeyHeader.iv === 'string') {
    receivedIv = base64ToUint8Array(encryptedKeyHeader.iv);
  }

  const bytes = await cbcDecrypt(encryptedAesKey, receivedIv, ss);
  const iv = bytes.subarray(0, 16);
  const aesKey = bytes.subarray(16);

  return {
    aesKey: aesKey,
    iv: iv,
  };
};

export const encryptKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader,
  transferIv: Uint8Array
): Promise<EncryptedKeyHeader> => {
  const ss = dotYouClient.getSharedSecret();
  if (!ss) {
    throw new Error('attempting to encrypt but missing the shared secret');
  }
  const combined = [...Array.from(keyHeader.iv), ...Array.from(keyHeader.aesKey)];
  const cipher = await cbcEncrypt(new Uint8Array(combined), transferIv, ss);

  return {
    iv: transferIv,
    encryptedAesKey: cipher,
    encryptionVersion: 1,
    type: 11,
  };
};

const GenerateKeyHeader = (): KeyHeader => {
  return {
    iv: getRandom16ByteArray(),
    aesKey: getRandom16ByteArray(),
  };
};

export const getRandom16ByteArray = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};
