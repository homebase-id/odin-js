import { AxiosRequestConfig } from 'axios';
import { DotYouClient, assertIfDotYouClientIsOwner } from '../../core/DotYouClient';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptChunkedBytesResponse,
  decryptBytesResponse,
} from '../../core/DriveData/SecurityHelpers';
import {
  GenerateKeyHeader,
  encryptMetaData,
  buildDescriptor,
  buildFormData,
  DEFAULT_PAYLOAD_KEY,
} from '../../core/DriveData/Upload/UploadHelpers';
import {
  TargetDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  DriveSearchResult,
  QueryBatchResponse,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
  FileMetadata,
  EncryptedKeyHeader,
  KeyHeader,
  SystemFileType,
  ImageContentType,
  ContentType,
  PagedResult,
  DriveDefinition,
  UploadFileMetadata,
  ThumbnailFile,
  TransferStatus,
  PayloadFile,
} from '../../core/core';
import {
  assertIfDefined,
  roundToSmallerMultipleOf16,
  roundToLargerMultipleOf16,
  tryJsonParse,
} from '../../helpers/DataUtil';
import { TransitInstructionSet, TransitUploadResult } from './TransitTypes';
import { hasDebugFlag } from '../../helpers/BrowserUtil';
import { parseBytesToObject } from '../../core/DriveData/File/DriveFileHelper';

interface GetFileRequest {
  odinId: string;
  file: {
    targetDrive: TargetDrive;
    fileId: string;
  };
}

interface GetPayloadRequest extends GetFileRequest {
  chunk?: { start: number; length?: number };
  key: string;
}

interface GetThumbRequest extends GetFileRequest {
  payloadKey: string;
}

interface TransitQueryBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
  odinId: string;
}

const _internalMetadataPromiseCache = new Map<string, Promise<DriveSearchResult>>();

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
    })
    .catch(() => {
      return {
        searchResults: [],
        cursorState: '',
        includeMetadataHeader: false,
        queryTime: 0,
      };
    });
};

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
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Key', key);

  const { keyHeader, chunkStart, chunkEnd } = options;
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });
  const request: GetPayloadRequest = {
    odinId: odinId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    key: key,
  };

  let startOffset = 0;
  if (chunkStart !== undefined) {
    request.chunk = {
      ...request.chunk,
      start: chunkStart === 0 ? 0 : roundToSmallerMultipleOf16(chunkStart - 16),
    };
    startOffset = Math.abs(chunkStart - request.chunk.start);

    if (chunkEnd !== undefined)
      request.chunk.length = roundToLargerMultipleOf16(chunkEnd - chunkStart + 1 + startOffset);
  }

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
  };

  return client
    .post<ArrayBuffer>('/transit/query/payload', request, config)
    .then(async (response) => {
      return {
        bytes: !decrypt
          ? new Uint8Array(response.data)
          : request.chunk?.start !== undefined
          ? (
              await decryptChunkedBytesResponse(
                dotYouClient,
                response,
                startOffset,
                request.chunk.start
              )
            ).slice(0, chunkEnd && chunkStart !== undefined ? chunkEnd - chunkStart + 1 : undefined)
          : await decryptBytesResponse(dotYouClient, response, keyHeader),
        contentType: `${response.headers.decryptedcontenttype}` as ContentType,
      };
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
};

export const getThumbBytesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  keyHeader: KeyHeader | undefined,
  width: number,
  height: number,
  systemFileType?: SystemFileType
): Promise<{ bytes: ArrayBuffer; contentType: ImageContentType }> => {
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });
  const request: GetThumbRequest = {
    odinId: odinId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
    payloadKey: key,
  };

  const config: AxiosRequestConfig = {
    responseType: 'arraybuffer',
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

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const request: GetFileRequest = {
    odinId: odinId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  const promise = client
    .post('/transit/query/header', request)
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
      console.error('[DotYouCore-js:getFileHeaderOverTransit]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

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
  assertIfDotYouClientIsOwner(dotYouClient);
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
    odinId: odinId,
  };

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  return client.post('transit/query/metadata/type', params).then((response) => {
    return {
      ...response.data,
      results: response?.data?.results?.map((result: { targetDrive: TargetDrive }) => {
        return { ...result, targetDriveInfo: result.targetDrive };
      }),
    };
  });
};

const isDebug = hasDebugFlag();

/// Upload methods
export const uploadFileOverTransit = async (
  dotYouClient: DotYouClient,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  encrypt = true
) => {
  isDebug &&
    console.debug(
      'request',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      {
        instructions,
        metadata,
      }
    );

  const keyHeader = encrypt ? GenerateKeyHeader() : undefined;
  const response = await uploadFileOverTransitUsingKeyHeader(
    dotYouClient,
    keyHeader,
    instructions,
    metadata,
    payloads,
    thumbnails
  );

  isDebug &&
    console.debug(
      'response',
      new URL(`${dotYouClient.getEndpoint()}/transit/sender/files/send'`).pathname,
      response
    );

  return response;
};

const failedTransferStatuses = [
  TransferStatus?.FileDoesNotAllowDistribution.toString().toLowerCase(),
  TransferStatus?.RecipientReturnedAccessDenied.toString().toLowerCase(),
  TransferStatus?.TotalRejectionClientShouldRetry.toString().toLowerCase(),
];

export const uploadFileOverTransitUsingKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: TransitInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[]
): Promise<TransitUploadResult> => {
  assertIfDotYouClientIsOwner(dotYouClient);
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

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    payloads,
    thumbnails,
    keyHeader
  );

  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const url = 'transit/sender/files/send';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
      'X-ODIN-FILE-SYSTEM-TYPE': instructions.systemFileType || 'Standard',
    },
  };

  return client
    .post<TransitUploadResult>(url, data, config)
    .then((response) => {
      const recipientStatus = response.data.recipientStatus;
      Object.keys(recipientStatus).forEach((key) => {
        if (failedTransferStatuses.includes(recipientStatus[key].toLowerCase()))
          throw new Error(`Recipient ${key} failed to receive file`);
      });

      return response.data;
    })
    .catch((error) => {
      console.error('[DotYouCore-js:uploadFileOverTransitUsingKeyHeader]', error);
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
      console.error('[DotYouCore-js:deleteFileOverTransit]', error);
      throw error;
    });
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
