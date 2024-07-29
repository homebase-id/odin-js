import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decryptJsonContent,
  decryptKeyHeader,
  DEFAULT_PAYLOAD_KEY,
  DeletedHomebaseFile,
  deleteFile,
  HomebaseFile,
  getContentFromHeaderOrPayload,
  getPayloadBytes,
  queryBatch,
  SystemFileType,
  TargetDrive,
  getFileHeader,
  getFileHeaderByUniqueId,
} from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';
import { jsonStringify64, tryJsonParse } from '@youfoundation/js-lib/helpers';
import { getFileHeaderBytesOverPeerByGlobalTransitId } from '@youfoundation/js-lib/peer';

const includeMetadataHeader = true;
const includeTransferHistory = true;
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
      {
        cursorState: pageParam,
        maxRecords: pageSize,
        includeMetadataHeader,
        includeTransferHistory,
      }
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

export const useFileQuery = ({
  targetDrive,
  id,
}: {
  targetDrive: TargetDrive | undefined;
  id: string | undefined;
}) => {
  const dotYouClient = useAuth().getDotYouClient();

  return useQuery({
    queryKey: ['file', targetDrive?.alias, id],
    queryFn: async () => {
      if (!id || !targetDrive) return null;

      // Search by fileId
      const fileByFileId = await getFileHeader(dotYouClient, targetDrive, id);
      if (fileByFileId) return fileByFileId;

      // Search by uniqueId
      const fileByUniqueId = await getFileHeaderByUniqueId(dotYouClient, targetDrive, id);
      if (fileByUniqueId) return fileByUniqueId;

      // Search by globalTransitId
      const fileByGlobalTransitId = await getFileHeaderBytesOverPeerByGlobalTransitId(
        dotYouClient,
        window.location.hostname,
        targetDrive,
        id
      );
      if (fileByGlobalTransitId) return fileByGlobalTransitId;
    },
    enabled: !!targetDrive && !!id,
  });
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

  const fetchFile = async (result: HomebaseFile | DeletedHomebaseFile, payloadKey?: string) => {
    if (payloadKey) {
      const payload = await getPayloadBytes(dotYouClient, targetDrive, result.fileId, payloadKey);
      if (!payload) return null;

      return window.URL.createObjectURL(
        new Blob([payload.bytes], {
          type: `${
            result.fileMetadata.payloads.find((payload) => payload.key === payloadKey)?.contentType
          };charset=utf-8`,
        })
      );
    }

    const decryptedJsonContent = await (async () => {
      try {
        return result.fileMetadata.appData.content && result.fileMetadata.isEncrypted
          ? await decryptJsonContent(
              result.fileMetadata,
              await decryptKeyHeader(dotYouClient, result.sharedSecretEncryptedKeyHeader)
            )
          : result.fileMetadata.appData.content;
      } catch (e) {
        return '{"error":"Failed to decrypt file"}';
      }
    })();

    const exportable = {
      fileId: result.fileId,
      fileMetadata: {
        ...result.fileMetadata,
        appData: {
          ...result.fileMetadata.appData,
          content: tryJsonParse(decryptedJsonContent),
        },
      },
      serverMetadata: result.serverMetadata,
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
