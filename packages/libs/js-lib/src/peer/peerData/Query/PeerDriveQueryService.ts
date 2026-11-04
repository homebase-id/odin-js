import { AxiosRequestConfig } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
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
import { getAxiosClientV2 } from '../../../core/DriveData/File/DriveFileHelper';
import { peerDriveRootV2 } from '../PeerRoutesV2';

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
  dotYouClient: DotYouClient,
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

  const client = getAxiosClientV2(dotYouClient, params.systemFileType);

  // V2 names the peer and the drive in the route; the query itself no longer carries the drive
  const { targetDrive, ...queryParams } = strippedQueryParams;
  const request: {
    queryParams: Omit<FileQueryParams, 'targetDrive'>;
    resultOptionsRequest: GetBatchQueryResultOptions;
  } = {
    queryParams,
    resultOptionsRequest: ro ?? DEFAULT_QUERY_BATCH_RESULT_OPTION,
  };

  if (decrypt) request.resultOptionsRequest.includeMetadataHeader = true;

  const url = `${peerDriveRootV2(odinId, targetDrive.alias)}/query-batch`;
  return client.post<R>(url, request, axiosConfig).then(async (response) => {
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

interface TransitQueryModifiedRequest {
  queryParams: FileQueryParams;
  resultOptions: GetModifiedResultOptions;
  odinId: string;
}

/// Query methods:
// Stays on V1: V2 has no peer query-modified route
export const queryModifiedOverPeer = async (
  dotYouClient: DotYouClient,
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

  const client = dotYouClient.createAxiosClient({
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
