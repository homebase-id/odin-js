import { DotYouClient } from '../../DotYouClient';
import {
  FileQueryParams,
  GetBatchQueryResultOptions,
  QueryBatchResponse,
  QueryBatchCollectionResponse,
  QueryBatchResponseResult,
  QueryBatchResponseWithDeletedResults,
} from '../Drive/DriveTypes';
import { SystemFileType } from '../File/DriveFileTypes';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { decryptJsonContent, decryptKeyHeader } from '../SecurityHelpers';

interface GetBatchRequestV2 {
  queryParams: Omit<FileQueryParams, 'targetDrive'>;
  resultOptionsRequest: GetBatchQueryResultOptions;
}

export const DEFAULT_QUERY_BATCH_RESULT_OPTION = {
  cursorState: undefined,
  maxRecords: 10,
  includeMetadataHeader: true,
};

/// Query methods:
type QueryBatchParamsWithoutFileState = Omit<FileQueryParams, 'fileState'>;
interface QueryBatchParamsWithFileState extends Omit<FileQueryParams, 'fileState'> {
  fileState: (0 | 1)[];
}

const toBatchQueryParams = (
  params: QueryBatchParamsWithFileState | QueryBatchParamsWithoutFileState
): FileQueryParams => {
  const strippedQueryParams: FileQueryParams = {
    ...params,
    fileState: 'fileState' in params ? params.fileState : [1],
    // if userDate is set, then we set userDateStart and userDateEnd,
    // is userDateStart and userDateEnd are userDate unset, we set userDate values
    userDateStart: params.userDate ? params.userDate.start : params.userDateStart,
    userDateEnd: params.userDate ? params.userDate.end : params.userDateEnd,
    userDate:
      'userDateStart' in params &&
      'userDateEnd' in params &&
      params.userDateStart !== undefined &&
      params.userDateEnd !== undefined
        ? {
            start: params.userDateStart,
            end: params.userDateEnd,
          }
        : params.userDate,
  };
  delete strippedQueryParams.systemFileType;
  return strippedQueryParams;
};

const decryptBatchResults = async <R>(dotYouClient: DotYouClient, data: R): Promise<R> => ({
  ...data,
  searchResults: await Promise.all(
    (data as QueryBatchResponseWithDeletedResults | QueryBatchResponse).searchResults.map(
      async (dsr) => {
        const keyheader = dsr.fileMetadata.isEncrypted
          ? await decryptKeyHeader(dotYouClient, dsr.sharedSecretEncryptedKeyHeader)
          : undefined;

        dsr.fileMetadata.appData.content = await decryptJsonContent(dsr.fileMetadata, keyheader);

        return dsr;
      }
    )
  ),
});

/// The query is always a POST on V2 (its body is shared-secret encrypted), with the drive in the route: its id is the
/// V1 alias, and the query params carry no targetDrive
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

  const client = dotYouClient.createAxiosClient({
    systemFileType: params.systemFileType,
    v2: true,
  });

  const { targetDrive, ...queryParams } = toBatchQueryParams(params);

  const request: GetBatchRequestV2 = {
    queryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
  };

  if (decrypt) request.resultOptionsRequest.includeMetadataHeader = true;

  return client
    .post<R>(`/drives/${targetDrive.alias}/files/query-batch`, request, axiosConfig)
    .then(async (response) =>
      decrypt ? decryptBatchResults(dotYouClient, response.data) : response.data
    );
};

/// Runs each query as its own V2 query-batch, in parallel. V2's query-batch-collection is not used: its maxRecords
/// is one budget for the whole call, filled greedily in order, where each query here asks for its own maxRecords.
/// As V1's collection did, a query on a drive the caller may not read comes back empty with `invalidDrive`, rather
/// than failing the others; any other error fails the call.
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
  if (new Set(queries.map((query) => query.name)).size !== queries.length)
    throw new Error('[odin-js] queryBatchCollection: the names of queries must be unique');

  const results = await Promise.all(
    queries.map(async (query): Promise<QueryBatchResponseResult> => {
      const ro = { ...(query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION) };
      try {
        const response = await queryBatch<QueryBatchParamsWithFileState, QueryBatchResponse>(
          dotYouClient,
          {
            ...query.queryParams,
            fileState: query.queryParams.fileState || [1],
            // The collection's file system applies to every query, as V1's request header did
            systemFileType,
          },
          ro,
          config
        );
        return { ...response, name: query.name };
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status !== 401 && status !== 403) throw error;

        // As V1's FromInvalidDrive: no rows, no cursor
        return {
          name: query.name,
          invalidDrive: true,
          searchResults: [],
          includeMetadataHeader: false,
          queryTime: 0,
          cursorState: null,
        } as unknown as QueryBatchResponseResult;
      }
    })
  );

  return { results };
};
