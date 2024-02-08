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
  axiosConfig?: AxiosRequestConfig
): Promise<QueryModifiedResponse> => {
  const strippedQueryParams = { ...params };
  delete strippedQueryParams.systemFileType;

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': params.systemFileType || 'Standard',
    },
  });

  const request: GetModifiedRequest = {
    queryParams: params,
    resultOptions: ro ?? DEFAULT_QUERY_MODIFIED_RESULT_OPTION,
  };

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

  return requestPromise.then((response) => {
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
  axiosConfig?: AxiosRequestConfig
): Promise<R> => {
  const strippedQueryParams: FileQueryParams = {
    ...params,
    fileState: 'fileState' in params ? params.fileState : [1],
  };
  delete strippedQueryParams.systemFileType;

  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': params.systemFileType || 'Standard',
    },
  });

  const request: GetBatchRequest = {
    queryParams: strippedQueryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
  };

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

  return requestPromise.then((response) => response.data);
};

export const queryBatchCollection = async (
  dotYouClient: DotYouClient,
  queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions;
  }[],
  systemFileType?: SystemFileType,
  axiosConfig?: AxiosRequestConfig
): Promise<QueryBatchCollectionResponse> => {
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const updatedQueries = queries.map((query) => {
    const ro = query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION;
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

  return requestPromise.then((response) => response.data);
};
