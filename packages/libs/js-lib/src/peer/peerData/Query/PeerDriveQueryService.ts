import { AxiosRequestConfig } from 'axios';
import { OdinClient } from '../../../core/OdinClient';
import {
  FileQueryParams,
  GetBatchQueryResultOptions,
  QueryBatchResponse,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
  decryptKeyHeader,
  decryptJsonContent,
  DEFAULT_QUERY_MODIFIED_RESULT_OPTION,
  GetModifiedResultOptions,
  QueryModifiedResponse,
  QueryBatchResponseWithDeletedResults,
} from '../../../core/core';

interface TransitQueryBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
  odinId: string;
}

type QueryBatchParamsWithoutFileState = Omit<FileQueryParams, 'fileState'>;
interface QueryBatchParamsWithFileState extends Omit<FileQueryParams, 'fileState'> {
  fileState: (0 | 1)[];
}
export const queryBatchOverPeer = async <
  T extends QueryBatchParamsWithFileState | QueryBatchParamsWithoutFileState,
  R = T extends QueryBatchParamsWithFileState
  ? QueryBatchResponseWithDeletedResults
  : QueryBatchResponse,
>(
  odinClient: OdinClient,
  odinId: string,
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
  };
  delete strippedQueryParams.systemFileType;

  const client = odinClient.createAxiosClient({
    systemFileType: params.systemFileType,
  });

  const request: TransitQueryBatchRequest = {
    queryParams: strippedQueryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
    odinId: odinId,
  };

  if (decrypt) request.resultOptionsRequest.includeMetadataHeader = true;

  return client.post<R>('/transit/query/batch', request, axiosConfig).then(async (response) => {
    if (decrypt) {
      return {
        ...response.data,
        searchResults: await Promise.all(
          (
            response.data as QueryBatchResponseWithDeletedResults | QueryBatchResponse
          ).searchResults.map(async (dsr) => {
            const keyheader = dsr.fileMetadata.isEncrypted
              ? await decryptKeyHeader(odinClient, dsr.sharedSecretEncryptedKeyHeader)
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

interface TransitQueryModifiedRequest {
  queryParams: FileQueryParams;
  resultOptions: GetModifiedResultOptions;
  odinId: string;
}

/// Query methods:
export const queryModifiedOverPeer = async (
  odinClient: OdinClient,
  odinId: string,
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

  const client = odinClient.createAxiosClient({
    systemFileType: params.systemFileType,
  });

  const request: TransitQueryModifiedRequest = {
    queryParams: params,
    resultOptions: ro ?? DEFAULT_QUERY_MODIFIED_RESULT_OPTION,
    odinId: odinId,
  };

  if (decrypt) request.resultOptions.includeHeaderContent = true;

  return client
    .post<QueryModifiedResponse>('/transit/query/modified', request, axiosConfig)
    .then(async (response) => {
      // Decrypt the content if requested
      if (decrypt) {
        return {
          ...response.data,
          searchResults: await Promise.all(
            response.data.searchResults.map(async (dsr) => {
              const keyheader = dsr.fileMetadata.isEncrypted
                ? await decryptKeyHeader(odinClient, dsr.sharedSecretEncryptedKeyHeader)
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
