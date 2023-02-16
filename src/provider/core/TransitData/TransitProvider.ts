import { byteArrayToString, splitSharedSecretEncryptedKeyHeader } from '../DataUtil';
import { DotYouClient } from '../DotYouClient';
import {
  decryptKeyHeader,
  decryptJsonContent,
  decryptUsingKeyHeader,
} from '../DriveData/DriveProvider';
import {
  DriveDefinition,
  DriveSearchResult,
  EncryptedKeyHeader,
  FileMetadata,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
  QueryBatchResponse,
  TargetDrive,
} from '../DriveData/DriveTypes';
import { PagedResult } from '../Types';

interface GetFileRequest {
  dotYouId: string;
  file: {
    targetDrive: TargetDrive;
    fileId: string;
  };
}

interface TransitQueryBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
  dotYouId: string;
}

const _internalMetadataCache = new Map<string, Promise<DriveSearchResult>>();

export const queryBatchOverTransit = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  params: FileQueryParams,
  ro?: GetBatchQueryResultOptions
): Promise<QueryBatchResponse> => {
  const client = dotYouClient.createAxiosClient();

  if (!ro) {
    ro = {
      cursorState: undefined,
      maxRecords: 10,
      includeMetadataHeader: true,
    };
  }

  const request: TransitQueryBatchRequest = {
    queryParams: params,
    resultOptionsRequest: ro,
    dotYouId: dotYouId,
  };

  return client.post<QueryBatchResponse>('/transit/query/batch', request).then((response) => {
    return response.data;
  });
};

export const getPayloadOverTransit = async <T>(
  dotYouClient: DotYouClient,
  dotYouId: string,
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
      dotYouId,
      targetDrive,
      fileId,
      keyheader
    );
  }
};

export const getPayloadAsJsonOverTransit = async <T>(
  dotYouClient: DotYouClient,
  dotYouId: string,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined
): Promise<T> => {
  return getPayloadBytesOverTransit(dotYouClient, dotYouId, targetDrive, fileId, keyHeader).then(
    (data) => {
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

export const getPayloadBytesOverTransit = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader?: KeyHeader | undefined
): Promise<{ bytes: ArrayBuffer; contentType: string }> => {
  const client = dotYouClient.createAxiosClient();
  const request: GetFileRequest = {
    dotYouId: dotYouId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  return client
    .post('/transit/query/payload', request, {
      responseType: 'arraybuffer',
    })
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
      console.error(error);
      throw error;
    });
};

export const getThumbBytesOverTransit = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  targetDrive: TargetDrive,
  fileId: string,
  keyHeader: KeyHeader | undefined,
  width: number,
  height: number
): Promise<{ bytes: ArrayBuffer; contentType: string }> => {
  const client = dotYouClient.createAxiosClient();
  const request: GetFileRequest = {
    dotYouId: dotYouId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  return client
    .post(
      '/transit/query/thumb',
      { ...request, width: width, height: height },
      {
        responseType: 'arraybuffer',
      }
    )
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
      throw error;
    });
};

export const getFileHeaderOverTransit = async (
  dotYouClient: DotYouClient,
  dotYouId: string,
  targetDrive: TargetDrive,
  fileId: string
): Promise<DriveSearchResult> => {
  const cacheKey = `${dotYouId}+${targetDrive.alias}-${targetDrive.type}+${fileId}`;
  if (_internalMetadataCache.has(cacheKey)) {
    const cacheData = await _internalMetadataCache.get(cacheKey);
    if (cacheData) {
      return cacheData;
    }
  }

  const client = dotYouClient.createAxiosClient();

  const request: GetFileRequest = {
    dotYouId: dotYouId,
    file: {
      targetDrive: targetDrive,
      fileId: fileId,
    },
  };

  const promise = client
    .post('/transit/query/header', request)
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
  dotYouId: string
): Promise<PagedResult<DriveDefinition>> => {
  const params = {
    driveType: type,
    pageNumber: pageNumber,
    pageSize: pageSize,
    dotYouId: dotYouId,
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
