import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  decryptJsonContent,
  decryptKeyHeader,
  DEFAULT_PAYLOAD_KEY,
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
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const fetchFiles = async ({
    targetDrive,
    pageParam,
  }: {
    targetDrive: TargetDrive;
    pageParam: string | undefined;
  }) => {
    const reponse = await queryBatch(
      dotYouClient,
      { targetDrive, systemFileType },
      { cursorState: pageParam, maxRecords: pageSize, includeMetadataHeader: includeMetadataHeader }
    );
    return reponse;
  };

  const fetchFile = async (result: DriveSearchResult, payloadKey?: string) => {
    if (result.fileMetadata.contentType !== 'application/json' && payloadKey) {
      const payload = await getPayloadBytes(dotYouClient, targetDrive, result.fileId, payloadKey, {
        keyHeader: result.fileMetadata.isEncrypted
          ? result.sharedSecretEncryptedKeyHeader
          : undefined,
      });
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
      payload:
        result.fileMetadata.contentType === 'application/json'
          ? await getContentFromHeaderOrPayload(
              dotYouClient,
              targetDrive,
              result,
              includeMetadataHeader
            )
          : await getPayloadBytes(dotYouClient, targetDrive, result.fileId, DEFAULT_PAYLOAD_KEY, {
              keyHeader: result.fileMetadata.isEncrypted
                ? result.sharedSecretEncryptedKeyHeader
                : undefined,
            }),
    };

    const stringified = jsonStringify64(exportable);
    const url = window.URL.createObjectURL(
      new Blob([stringified], { type: 'application/json;charset=utf-8' })
    );

    return url;
  };

  const removeFile = async (fileId: string) => await deleteFile(dotYouClient, targetDrive, fileId);

  return {
    fetch: useInfiniteQuery({
      queryKey: ['files', systemFileType || 'Standard', targetDrive.alias],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchFiles({ targetDrive, pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage?.searchResults?.length >= pageSize ? lastPage?.cursorState : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!targetDrive,
    }),
    fetchFile: fetchFile,
    deleteFile: useMutation({
      mutationFn: removeFile,
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ['files', systemFileType || 'Standard', targetDrive.alias],
        });
      },
    }),
  };
};
