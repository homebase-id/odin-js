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
  ThumbnailFile,
  ImageContentType,
} from './DriveTypes';
import { AxiosRequestConfig } from 'axios';
import {
  AppendInstructionSet,
  SystemFileType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from './DriveUploadTypes';
import { ApiType, DotYouClient } from '../DotYouClient';
import {
  encryptMetaData,
  buildDescriptor,
  buildFormData,
  pureUpload,
  GenerateKeyHeader,
  pureAppend,
} from './UploadHelpers';
import {
  decryptKeyHeader,
  decryptJsonContent,
  encryptWithKeyheader,
  decryptBytesResponse,
  decryptChunkedBytesResponse,
  encryptWithSharedSecret,
} from './SecurityHelpers';
import {
  byteArrayToString,
  roundToLargerMultipleOf16,
  roundToSmallerMultipleOf16,
  stringify,
} from '../../helpers/helpers';
import { PagedResult, PagingOptions } from '../core';

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

interface GetPayloadRequest extends GetFileRequest {
  chunkStart?: number;
  chunkLength?: number;
}

const _internalMetadataCache = new Map<string, Promise<DriveSearchResult>>();

export const assertIfDefined = (key: string, value: unknown) => {
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
        results: response?.data?.results?.map((result: { targetDrive: TargetDrive }) => {
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
      console.error('[DotYouCore-js:ensureDrive]', error);
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

  const strippedQueryParams = { ...params };
  delete strippedQueryParams.systemFileType;

  const request: GetBatchRequest = {
    queryParams: strippedQueryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': params.systemFileType || 'Standard',
    },
  };

  return client.post<QueryBatchResponse>('/drive/query/batch', request, config).then((response) => {
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
  }[],
  systemFileType?: SystemFileType
): Promise<QueryBatchCollectionResponse> => {
  const client = dotYouClient.createAxiosClient();

  const updatedQueries = queries.map((query) => {
    const ro = query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION;
    return {
      ...query,
      resultOptionsRequest: ro,
    };
  });

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  return client
    .post<QueryBatchCollectionResponse>(
      '/drive/query/batchcollection',
      {
        queries: updatedQueries,
      },
      config
    )
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
  fileId: string,
  systemFileType?: SystemFileType,
  skipCache?: boolean
): Promise<DriveSearchResult> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const cacheKey = `${targetDrive.alias}-${targetDrive.type}+${fileId}`;
  if (_internalMetadataCache.has(cacheKey) && !skipCache) {
    const cacheEntry = await _internalMetadataCache.get(cacheKey);
    if (cacheEntry) return cacheEntry;
  }

  const client = dotYouClient.createAxiosClient();

  const request: GetFileRequest = {
    ...targetDrive,
    fileId,
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  const promise = client
    .get('/drive/files/header?' + stringify(request), config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error.response?.status === 404) {
        return undefined;
      } else {
        console.error('[DotYouCore-js:getFileHeader]', error);
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

  const client = dotYouClient.createAxiosClient();
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
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
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
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType }> => {
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
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
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
      console.error('[DotYouCore-js:getThumbBytes]', error);
      throw error;
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

  const client = dotYouClient.createAxiosClient();

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    deleteLinkedFiles: deleteLinkedFiles ?? true,
    recipients: recipients,
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  return client
    .post('/drive/files/delete', request, config)
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
  const client = dotYouClient.createAxiosClient();

  const request = {
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    width,
    height,
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  client
    .post('/attachments/deletethumbnail', request, config)
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
  const client = dotYouClient.createAxiosClient();

  const request = {
    key: '', // TODO: Add key (reference to a key for multiple payloads in a single file)
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  client
    .post('/attachments/deletepayload', request, config)
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

    const config = {
      headers: {
        'X-ODIN-FILE-SYSTEM-TYPE': 'Standard',
      },
    };

    return client
      .post('/drive/files/harddelete', request, config)
      .then((response) => {
        if (response.status === 200) {
          return true;
        }

        return false;
      })
      .catch((error) => {
        console.error('[DotYouCore-js:purgeFile]', error);
        throw error;
      });
  };

  await Promise.all(
    searchResults.map(async (result) => await purgeFile(targetDrive, result.fileId))
  );

  return true;
};

/// Upload methods:
export const uploadFile = async (
  dotYouClient: DotYouClient,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payload: Uint8Array | File | undefined,
  thumbnails?: ThumbnailFile[],
  encrypt = true,
  onVersionConflict?: () => void
): Promise<UploadResult> => {
  const keyHeader = encrypt ? GenerateKeyHeader() : undefined;
  return uploadUsingKeyHeader(
    dotYouClient,
    keyHeader,
    instructions,
    metadata,
    payload,
    thumbnails,
    onVersionConflict
  );
};

const uploadUsingKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payload: Uint8Array | File | undefined,
  thumbnails?: ThumbnailFile[],
  onVersionConflict?: () => void
): Promise<UploadResult> => {
  // Rebuild instructions without the systemFileType
  const strippedInstructions: UploadInstructionSet = {
    storageOptions: instructions.storageOptions,
    transferIv: instructions.transferIv,
    transitOptions: instructions.transitOptions,
  };

  // Build package
  const encryptedMetaData = await encryptMetaData(metadata, keyHeader);
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    keyHeader,
    instructions,
    encryptedMetaData
  );

  // const payloadIsFile = payload instanceof File;
  // if (payloadIsFile && keyHeader) {
  //   throw new Error('Cannot upload a file with a key header');
  // }

  const processedPayload =
    metadata.appData.contentIsComplete || !payload
      ? undefined
      : keyHeader
      ? await encryptWithKeyheader(payload, keyHeader)
      : payload;

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    processedPayload,
    thumbnails,
    keyHeader
  );

  // Upload
  return await pureUpload(dotYouClient, data, instructions.systemFileType, onVersionConflict);
};

export const uploadHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata
): Promise<UploadResult> => {
  const keyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : undefined;

  // Rebuild instructions without the systemFileType
  const strippedInstructions: UploadInstructionSet = {
    storageOptions: instructions.storageOptions,
    transferIv: instructions.transferIv,
    transitOptions: instructions.transitOptions,
  };

  // Build package
  const encryptedMetaData = await encryptMetaData(metadata, keyHeader);
  const strippedMetaData: UploadFileMetadata = {
    ...encryptedMetaData,
    appData: { ...encryptedMetaData.appData, additionalThumbnails: undefined },
  };

  const encryptedDescriptor = await encryptWithSharedSecret(
    dotYouClient,
    {
      fileMetadata: strippedMetaData,
    },
    instructions.transferIv
  );

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    undefined,
    undefined,
    undefined
  );

  // Upload
  return await pureUpload(dotYouClient, data, instructions.systemFileType);
};

export const appendDataToFile = async (
  dotYouClient: DotYouClient,
  instructions: AppendInstructionSet,
  payload: Uint8Array | File | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  keyHeader: KeyHeader,
  onVersionConflict?: () => void
) => {
  const strippedInstructions: AppendInstructionSet = {
    targetFile: instructions.targetFile,
    thumbnails: instructions.thumbnails,
  };

  const processedPayload = !payload
    ? undefined
    : keyHeader
    ? await encryptWithKeyheader(payload, keyHeader)
    : payload;

  const data = await buildFormData(
    strippedInstructions,
    undefined,
    processedPayload,
    thumbnails,
    keyHeader
  );

  return await pureAppend(dotYouClient, data, instructions.systemFileType, onVersionConflict);
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
    return await decryptJsonContent<T>(fileHeader.fileMetadata, keyheader);
  } else {
    return await getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, keyheader, systemFileType);
  }
};
