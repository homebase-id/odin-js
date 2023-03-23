import { AxiosRequestConfig } from 'axios';
import {
  byteArrayToString,
  splitSharedSecretEncryptedKeyHeader,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '../helpers/DataUtil';
import { DotYouClient } from '../DotYouClient';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptUsingKeyHeader,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
  encryptKeyHeader,
  GenerateKeyHeader,
  encryptWithKeyheader,
  EMPTY_KEY_HEADER,
  encryptWithSharedSecret,
  toBlob,
} from '../DriveData/DriveProvider';
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
import {
  SystemFileType,
  UploadFileDescriptor,
  UploadFileMetadata,
} from '../DriveData/DriveUploadTypes';
import { PagedResult } from '../helpers/Types';
import {
  TransitQueryBatchRequest,
  GetFileRequest,
  TransitInstructionSet,
  TransitUploadResult,
} from './TransitTypes';

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
    .post('/transit/query/payload', request, config)
    .then(async (response) => {
      if (keyHeader) {
        const cipher = new Uint8Array(response.data);
        return decryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
          return {
            bytes,
            contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
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
        return {
          bytes,
          contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
        };
      } else {
        return {
          bytes: new Uint8Array(response.data),
          contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
        };
      }
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
    .post('/transit/query/thumb', { ...request, width: width, height: height }, config)
    .then(async (response) => {
      if (keyHeader) {
        const cipher = new Uint8Array(response.data);
        return decryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
          return {
            bytes,
            contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
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
        return {
          bytes,
          contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
        };
      } else {
        return {
          bytes: new Uint8Array(response.data),
          contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
        };
      }
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
  odinId: string
): Promise<PagedResult<DriveDefinition>> => {
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
    odinId: odinId,
  };

  const client = dotYouClient.createAxiosClient();
  return client.post('transit/query/metadata/type', params).then((response) => {
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
  data.append('instructions', toBlob(strippedInstructions));
  data.append('metaData', new Blob([encryptedDescriptor]));

  if (metadata.appData.contentIsComplete) {
    data.append('payload', new Blob([]));
  } else {
    data.append('payload', new Blob([encryptedPayload]));
  }

  if (thumbnails) {
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      const filename = `${thumb.pixelWidth}x${thumb.pixelHeight}`;

      const thumbnailBytes = keyHeader
        ? await encryptWithKeyheader(thumb.payload, keyHeader)
        : thumb.payload;
      data.append(
        'thumbnail',
        new Blob([thumbnailBytes], {
          type: thumb.contentType,
        }),
        filename
      );
    }
  }

  const client = dotYouClient.createAxiosClient(true);
  const url = '/sender/files/send';

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
