import { AxiosRequestConfig } from 'axios';
import {
  byteArrayToString,
  roundToLargerMultipleOf16,
  roundToSmallerMultipleOf16,
} from '../helpers/DataUtil';
import { DotYouClient } from '../DotYouClient';
import { assertIfDefined, DEFAULT_QUERY_BATCH_RESULT_OPTION } from '../DriveData/DriveProvider';
import {
  DriveDefinition,
  DriveSearchResult,
  EncryptedKeyHeader,
  FileMetadata,
  FileQueryParams,
  GetBatchQueryResultOptions,
  ImageContentType,
  KeyHeader,
  QueryBatchResponse,
  TargetDrive,
  ThumbnailFile,
} from '../DriveData/DriveTypes';
import { SystemFileType, UploadFileMetadata } from '../DriveData/DriveUploadTypes';
import { PagedResult } from '../helpers/Types';
import {
  decryptKeyHeader,
  decryptJsonContent,
  encryptWithKeyheader,
  decryptBytesResponse,
  decryptChunkedBytesResponse,
} from '../DriveData/SecurityHelpers';
import { TransitInstructionSet, TransitUploadResult } from './TransitTypes';
import {
  GenerateKeyHeader,
  encryptMetaData,
  buildDescriptor,
  buildFormData,
} from '../DriveData/UploadHelpers';

interface GetFileRequest {
  odinId: string;
  file: {
    targetDrive: TargetDrive;
    fileId: string;
  };
}

interface GetPayloadRequest extends GetFileRequest {
  chunk?: { start: number; length?: number };
}

interface TransitQueryBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
  odinId: string;
}

const _internalMetadataCache = new Map<string, Promise<DriveSearchResult>>();

export const queryBatchOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  params: FileQueryParams,
  ro?: GetBatchQueryResultOptions
): Promise<QueryBatchResponse> => {
  const client = dotYouClient.createAxiosClient();

  const strippedQueryParams = { ...params };
  delete strippedQueryParams.systemFileType;

  const request: TransitQueryBatchRequest = {
    queryParams: strippedQueryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
    odinId: odinId,
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': params.systemFileType || 'Standard',
    },
  };

  return client
    .post<QueryBatchResponse>('/transit/query/batch', request, config)
    .then((response) => {
      return response.data;
    });
};

export const getPayloadOverTransit = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  },
  includesJsonContent: boolean
): Promise<T> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;

  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader)
    : undefined;

  if (fileMetadata.appData.contentIsComplete && includesJsonContent) {
    return await decryptJsonContent<T>(fileMetadata, keyheader);
  } else {
    return await getPayloadAsJsonOverTransit<T>(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      keyheader
    );
  }
};

export const getPayloadAsJsonOverTransit = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined,
  systemFileType?: SystemFileType
): Promise<T> => {
  return getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    keyHeader,
    systemFileType
  ).then((data) => {
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

export const getPayloadBytesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader?: KeyHeader | undefined,
  systemFileType?: SystemFileType,
  chunkStart?: number,
  chunkLength?: number
): Promise<{ bytes: Uint8Array; contentType: ImageContentType }> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);

  const client = dotYouClient.createAxiosClient();
  const request: GetPayloadRequest = {
    odinId: odinId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  let startOffset = 0;
  if (chunkStart !== undefined) {
    request.chunk = {
      ...request.chunk,
      start: chunkStart === 0 ? 0 : roundToSmallerMultipleOf16(chunkStart - 16),
    };
    startOffset = Math.abs(chunkStart - request.chunk.start);

    if (chunkLength !== undefined) {
      request.chunk = {
        ...request.chunk,
        length: roundToLargerMultipleOf16(chunkLength + startOffset),
      };
    }
  }

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  return client
    .post<ArrayBuffer>('/transit/query/payload', request, config)
    .then(async (response) => {
      return {
        bytes:
          request.chunk?.start !== undefined
            ? (
                await decryptChunkedBytesResponse(
                  dotYouClient,
                  response,
                  startOffset,
                  request.chunk.start
                )
              ).slice(0, chunkLength)
            : await decryptBytesResponse(dotYouClient, response, keyHeader),
        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
      };
    })
    .catch((error) => {
      console.error(error);
      throw error;
    });
};

export const getThumbBytesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined,
  width: number,
  height: number,
  systemFileType?: SystemFileType
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType }> => {
  const client = dotYouClient.createAxiosClient();
  const request: GetFileRequest = {
    odinId: odinId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  return client
    .post<ArrayBuffer>('/transit/query/thumb', { ...request, width: width, height: height }, config)
    .then(async (response) => {
      return {
        bytes: await decryptBytesResponse(dotYouClient, response, keyHeader),
        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
      };
    })
    .catch((error) => {
      throw error;
    });
};

export const getFileHeaderOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<DriveSearchResult> => {
  const cacheKey = `${odinId}+${targetDrive.alias}-${targetDrive.type}+${fileId}`;
  if (_internalMetadataCache.has(cacheKey)) {
    const cacheData = await _internalMetadataCache.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }
  }

  const client = dotYouClient.createAxiosClient();

  const request: GetFileRequest = {
    odinId: odinId,
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

  const promise = client
    .post('/transit/query/header', request, config)
    .then((response) => {
      return response.data as DriveSearchResult;
    })
    .catch((error) => {
      //TODO: Handle this - the file was not uploaded
      console.error(error);
      throw error;
    });

  _internalMetadataCache.set(cacheKey, promise);

  return promise;
};

/// Drive methods:
//returns all drives for a given type
export const getDrivesByTypeOverTransit = async (
  dotYouClient: DotYouClient,
  type: string,
  pageNumber: number,
  pageSize: number,
  odinId: string,
  systemFileType?: SystemFileType
): Promise<PagedResult<DriveDefinition>> => {
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
    odinId: odinId,
  };

  const config = {
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  const client = dotYouClient.createAxiosClient();
  return client.post('transit/query/metadata/type', params, config).then((response) => {
    return {
      ...response.data,
      results: response?.data?.results?.map((result: { targetDrive: TargetDrive }) => {
        return { ...result, targetDriveInfo: result.targetDrive };
      }),
    };
  });
};

/// Upload methods
export const uploadFileOverTransit = async (
  dotYouClient: DotYouClient,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payload: Uint8Array,
  thumbnails?: ThumbnailFile[],
  encrypt = true
) => {
  const keyHeader = encrypt ? GenerateKeyHeader() : undefined;
  return uploadFileOverTransitUsingKeyHeader(
    dotYouClient,
    keyHeader,
    instructions,
    metadata,
    payload,
    thumbnails
  );
};

export const uploadFileOverTransitUsingKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payload: Uint8Array,
  thumbnails?: ThumbnailFile[]
): Promise<TransitUploadResult> => {
  const strippedInstructions: TransitInstructionSet = {
    transferIv: instructions.transferIv,
    overwriteGlobalTransitFileId: instructions.overwriteGlobalTransitFileId,
    remoteTargetDrive: instructions.remoteTargetDrive,
    schedule: instructions.schedule,
    recipients: instructions.recipients,
  };

  const encryptedMetaData = await encryptMetaData(metadata, keyHeader);
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    keyHeader,
    instructions,
    encryptedMetaData
  );

  const processedPayload = metadata.appData.contentIsComplete
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

  const client = dotYouClient.createAxiosClient(true);
  const url = 'transit/sender/files/send';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
      'X-ODIN-FILE-SYSTEM-TYPE': instructions.systemFileType || 'Standard',
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

export const deleteFileOverTransit = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  globalTransitId: string,
  recipients?: string[],
  systemFileType?: SystemFileType
): Promise<boolean | void> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GlobalTransitId', globalTransitId);

  const client = dotYouClient.createAxiosClient();

  const request = {
    fileSystemType: systemFileType || 'Standard',
    globalTransitIdFileIdentifier: {
      targetDrive: targetDrive,
      globalTransitId: globalTransitId,
    },
    recipients: recipients,
  };

  return client
    .post('/transit/sender/files/senddeleterequest', request)
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
