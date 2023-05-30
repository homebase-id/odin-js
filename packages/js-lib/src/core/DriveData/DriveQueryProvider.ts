import { DotYouClient } from '../DotYouClient';
import {
  FileQueryParams,
  GetModifiedResultOptions,
  QueryModifiedResponse,
  GetBatchQueryResultOptions,
  QueryBatchResponse,
  QueryBatchCollectionResponse,
} from './DriveTypes';
import { SystemFileType } from './DriveFileTypes';
import { stringifyToQueryParams } from '../../helpers/DataUtil';

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
  includeJsonContent: true,
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
  ro?: GetModifiedResultOptions
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
      return client.post<QueryModifiedResponse>('/drive/query/modified', request);
    } else {
      return client.get<QueryModifiedResponse>(getUrl);
    }
  })();

  return requestPromise.then((response) => {
    return response.data;
  });
};

export const queryBatch = async (
  dotYouClient: DotYouClient,
  params: FileQueryParams,
  ro?: GetBatchQueryResultOptions
): Promise<QueryBatchResponse> => {
  const strippedQueryParams = { ...params };
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
      return client.post<QueryBatchResponse>('/drive/query/batch', request);
    } else {
      return client.get<QueryBatchResponse>(getUrl);
    }
  })();

  return requestPromise.then((response) => {
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
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const updatedQueries = queries.map((query) => {
    const ro = query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION;
    return {
      ...query,
      resultOptionsRequest: ro,
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
