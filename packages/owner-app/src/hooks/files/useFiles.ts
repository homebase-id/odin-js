import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  decryptJsonContent,
  decryptKeyHeader,
  DEFAULT_PAYLOAD_KEY,
  DeletedDriveSearchResult,
  deleteFile,
  DriveSearchResult,
  getContentFromHeaderOrPayload,
  getPayloadBytes,
  queryBatch,
  SystemFileType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';
import { jsonStringify64, tryJsonParse } from '@youfoundation/js-lib/helpers';

const includeMetadataHeader = true;
const pageSize = 300;

export const useFiles = ({
  targetDrive,
  systemFileType,
}: {
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchFiles = async ({
    targetDrive,
    pageParam,
  }: {
    targetDrive: TargetDrive;
    pageParam: string | undefined;
  }) => {
    const response = await queryBatch(
      dotYouClient,
      { targetDrive, systemFileType },
      { cursorState: pageParam, maxRecords: pageSize, includeMetadataHeader: includeMetadataHeader }
    );
    return response;
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['files', systemFileType?.toLowerCase() || 'standard', targetDrive.alias],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchFiles({ targetDrive, pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage?.searchResults?.length >= pageSize ? lastPage?.cursorState : undefined,
      enabled: !!targetDrive,
    }),
  };
};

export const useFile = ({
  targetDrive,
  systemFileType,
}: {
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const fetchFile = async (
    result: DriveSearchResult | DeletedDriveSearchResult,
    payloadKey?: string
  ) => {
    if (payloadKey) {
      const payload = await getPayloadBytes(dotYouClient, targetDrive, result.fileId, payloadKey);
      if (!payload) return null;

      return window.URL.createObjectURL(
        new Blob([payload.bytes], {
          type: `${result.fileMetadata.payloads.find((payload) => payload.key === payloadKey)
            ?.contentType};charset=utf-8`,
        })
      );
    }

    const decryptedJsonContent =
      result.fileMetadata.appData.content && result.fileMetadata.isEncrypted
        ? await decryptJsonContent(
            result.fileMetadata,
            await decryptKeyHeader(dotYouClient, result.sharedSecretEncryptedKeyHeader)
          )
        : result.fileMetadata.appData.content;

    const exportable = {
      fileId: result.fileId,
      fileMetadata: {
        ...result.fileMetadata,
        appData: {
          ...result.fileMetadata.appData,
          content: tryJsonParse(decryptedJsonContent),
        },
      },
      defaultPayload: result.fileMetadata.payloads.some(
        (payload) => payload.contentType === 'application/json'
      )
        ? await getContentFromHeaderOrPayload(
            dotYouClient,
            targetDrive,
            result,
            includeMetadataHeader
          )
        : await getPayloadBytes(dotYouClient, targetDrive, result.fileId, DEFAULT_PAYLOAD_KEY),
    };

    const stringified = jsonStringify64(exportable);
    const url = window.URL.createObjectURL(
      new Blob([stringified], { type: 'application/json;charset=utf-8' })
    );

    return url;
  };

  const removeFile = async (fileId: string) => await deleteFile(dotYouClient, targetDrive, fileId);

  return {
    fetchFile: fetchFile,
    deleteFile: useMutation({
      mutationFn: removeFile,
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ['files', systemFileType?.toLowerCase() || 'standard', targetDrive.alias],
          exact: false,
        });
      },
    }),
  };
};
