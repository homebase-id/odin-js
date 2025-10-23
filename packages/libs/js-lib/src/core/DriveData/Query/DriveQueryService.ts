import { DotYouClient } from '../../DotYouClient';
import {
  FileQueryParams,
  GetModifiedResultOptions,
  QueryModifiedResponse,
  GetBatchQueryResultOptions,
  QueryBatchResponse,
  QueryBatchCollectionResponse,
  QueryBatchResponseWithDeletedResults,
} from '../Drive/DriveTypes';
import { SystemFileType } from '../File/DriveFileTypes';
import { stringifyArrayToQueryParams, stringifyToQueryParams } from '../../../helpers/DataUtil';
import { AxiosRequestConfig } from 'axios';
import { decryptJsonContent, decryptKeyHeader } from '../SecurityHelpers';

interface GetModifiedRequest {
  queryParams: FileQueryParams;
  resultOptions: GetModifiedResultOptions;
}

interface GetBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
}

export const DEFAULT_QUERY_MODIFIED_RESULT_OPTION = {
  cursor: undefined,
  maxRecords: 10,
  includeHeaderContent: true,
  excludePreviewThumbnail: false,
};

export const DEFAULT_QUERY_BATCH_RESULT_OPTION = {
  cursorState: undefined,
  maxRecords: 10,
  includeMetadataHeader: true,
};

/// Query methods:
export const queryModified = async (
  dotYouClient: DotYouClient,
  params: FileQueryParams,
  ro?: GetModifiedResultOptions,
  options?: {
    decrypt?: boolean;
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<QueryModifiedResponse> => {
  const { decrypt, axiosConfig } = options ?? {};

  const strippedQueryParams = { ...params };
  delete strippedQueryParams.systemFileType;

  const client = dotYouClient.createAxiosClient({
    systemFileType: params.systemFileType,
  });

  const request: GetModifiedRequest = {
    queryParams: params,
    resultOptions: ro ?? DEFAULT_QUERY_MODIFIED_RESULT_OPTION,
  };

  if (decrypt) request.resultOptions.includeHeaderContent = true;

  const requestPromise = (() => {
    const queryParams = stringifyToQueryParams({
      ...request.queryParams,
      ...request.resultOptions,
    });

    const getUrl = '/drive/query/modified?' + queryParams;
    // Max Url is 1800 so we keep room for encryption overhead
    if ([...(client.defaults.baseURL || ''), ...getUrl].length > 1800) {
      return client.post<QueryModifiedResponse>('/drive/query/modified', request, axiosConfig);
    } else {
      return client.get<QueryModifiedResponse>(getUrl, axiosConfig);
    }
  })();

  return requestPromise.then(async (response) => {
    // Decrypt the content if requested
    if (decrypt) {
      return {
        ...response.data,
        searchResults: await Promise.all(
          response.data.searchResults.map(async (dsr) => {
            const keyheader = dsr.fileMetadata.isEncrypted
              ? await decryptKeyHeader(dotYouClient, dsr.sharedSecretEncryptedKeyHeader)
              : undefined;

            dsr.fileMetadata.appData.content = await decryptJsonContent(
              dsr.fileMetadata,
              keyheader
            );

            return dsr;
          })
        ),
      };
    }

    return response.data;
  });
};

type QueryBatchParamsWithoutFileState = Omit<FileQueryParams, 'fileState'>;
interface QueryBatchParamsWithFileState extends Omit<FileQueryParams, 'fileState'> {
  fileState: (0 | 1)[];
}
export const queryBatch = async <
  T extends QueryBatchParamsWithFileState | QueryBatchParamsWithoutFileState,
  R = T extends QueryBatchParamsWithFileState
  ? QueryBatchResponseWithDeletedResults
  : QueryBatchResponse,
>(
  dotYouClient: DotYouClient,
  params: T,
  ro?: GetBatchQueryResultOptions,
  options?: {
    decrypt?: boolean;
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<R> => {
  const { decrypt, axiosConfig } = options ?? {};

  const strippedQueryParams: FileQueryParams = {
    ...params,
    fileState: 'fileState' in params ? params.fileState : [1],
    // if userDate is set, then we set userDateStart and userDateEnd,
    // is userDateStart and userDateEnd are userDate unset, we set userDate values
    userDateStart: params.userDate ? params.userDate.start : params.userDateStart,
    userDateEnd: params.userDate ? params.userDate.end : params.userDateEnd,
    userDate: 'userDateStart' in params && 'userDateEnd' in params && params.userDateStart !== undefined && params.userDateEnd !== undefined
      ? {
        start: params.userDateStart,
        end: params.userDateEnd,
      }
      : params.userDate,
  };
  delete strippedQueryParams.systemFileType;

  const client = dotYouClient.createAxiosClient({
    systemFileType: params.systemFileType,
  });

  const request: GetBatchRequest = {
    queryParams: strippedQueryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
  };

  if (decrypt) request.resultOptionsRequest.includeMetadataHeader = true;

  const requestPromise = (() => {
    const queryParams = stringifyToQueryParams({
      ...request.queryParams,
      ...request.resultOptionsRequest,
    });


    const getUrl = '/drive/query/batch?' + queryParams;
    // Max Url is 1800 so we keep room for encryption overhead
    if ([...(client.defaults.baseURL || ''), ...getUrl].length > 1800) {
      return client.post<R>('/drive/query/batch', request, axiosConfig);
    } else {
      return client.get<R>(getUrl, axiosConfig);
    }
  })();

  return requestPromise.then(async (response) => {
    if (decrypt) {
      return {
        ...response.data,
        searchResults: await Promise.all(
          (
            response.data as QueryBatchResponseWithDeletedResults | QueryBatchResponse
          ).searchResults.map(async (dsr) => {
            const keyheader = dsr.fileMetadata.isEncrypted
              ? await decryptKeyHeader(dotYouClient, dsr.sharedSecretEncryptedKeyHeader)
              : undefined;

            dsr.fileMetadata.appData.content = await decryptJsonContent(
              dsr.fileMetadata,
              keyheader
            );

            return dsr;
          })
        ),
      };
    }

    return response.data;
  });
};

export const queryBatchCollection = async (
  dotYouClient: DotYouClient,
  queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions;
  }[],
  systemFileType?: SystemFileType,
  config?: {
    decrypt?: boolean;
    axiosConfig?: AxiosRequestConfig;
  }
): Promise<QueryBatchCollectionResponse> => {
  const { decrypt, axiosConfig } = config ?? {};

  const client = dotYouClient.createAxiosClient({
    systemFileType,
  });

  const updatedQueries = queries.map((query) => {
    const ro = query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION;
    if (decrypt) ro.includeMetadataHeader = true;
    return {
      ...query,
      queryParams: { ...query.queryParams, fileState: query.queryParams.fileState || [1] },
      resultOptionsRequest: ro,
    };
  });

  const requestPromise = (() => {
    const queryParams = stringifyArrayToQueryParams([
      ...updatedQueries.map((q) => ({ name: q.name, ...q.queryParams, ...q.resultOptionsRequest })),
    ]);

    const getUrl = '/drive/query/batchcollection?' + queryParams;
    // Max Url is 1800 so we keep room for encryption overhead
    if ([...(client.defaults.baseURL || ''), ...getUrl].length > 1800) {
      return client.post<QueryBatchCollectionResponse>(
        '/drive/query/batchcollection',
        {
          queries: updatedQueries,
        },
        axiosConfig
      );
    } else {
      return client.get<QueryBatchCollectionResponse>(getUrl, axiosConfig);
    }
  })();

  return requestPromise.then(async (response) => {
    if (decrypt) {
      return {
        ...response.data,
        results: await Promise.all(
          response.data.results.map(async (result) => {
            return {
              ...result,
              searchResults: await Promise.all(
                result.searchResults.map(async (dsr) => {
                  const keyheader = dsr.fileMetadata.isEncrypted
                    ? await decryptKeyHeader(dotYouClient, dsr.sharedSecretEncryptedKeyHeader)
                    : undefined;

                  dsr.fileMetadata.appData.content = await decryptJsonContent(
                    dsr.fileMetadata,
                    keyheader
                  );
                  return dsr;
                })
              ),
            };
          })
        ),
      };
    }

    return response.data;
  });
};
