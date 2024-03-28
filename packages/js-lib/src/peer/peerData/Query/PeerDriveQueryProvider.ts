import { DotYouClient } from '../../../core/DotYouClient';
import {
  FileQueryParams,
  GetBatchQueryResultOptions,
  QueryBatchResponse,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
} from '../../../core/core';

interface TransitQueryBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
  odinId: string;
}

export const queryBatchOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  params: FileQueryParams,
  ro?: GetBatchQueryResultOptions
): Promise<QueryBatchResponse> => {
  const client = dotYouClient.createAxiosClient({ systemFileType: params.systemFileType });

  const strippedQueryParams = { ...params };
  delete strippedQueryParams.systemFileType;

  const request: TransitQueryBatchRequest = {
    queryParams: strippedQueryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
    odinId: odinId,
  };

  return client
    .post<QueryBatchResponse>('/transit/query/batch', request)
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
