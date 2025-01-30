import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  decryptJsonContent,
  decryptKeyHeader,
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
  getFileHeaderBytesByGlobalTransitId,
  getLocalContentFromHeader,
} from '@homebase-id/js-lib/core';
import { jsonStringify64, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';

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
  const dotYouClient = useDotYouClientContext();

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
  systemFileType,
}: {
  targetDrive: TargetDrive | undefined;
  id: string | undefined;
  systemFileType?: SystemFileType;
}) => {
  const dotYouClient = useDotYouClientContext();

  return useQuery({
    queryKey: ['file', targetDrive?.alias, id],
    queryFn: async () => {
      if (!id || !targetDrive) return null;

      const rawFile = await (async () => {
        // Search by fileId
        const fileByFileId = await getFileHeader(dotYouClient, targetDrive, id, { systemFileType });
        if (fileByFileId) return fileByFileId;

        // Search by uniqueId
        const fileByUniqueId = await getFileHeaderByUniqueId(dotYouClient, targetDrive, id, {
          systemFileType,
        });
        if (fileByUniqueId) return fileByUniqueId;

        // Search by globalTransitId
        const fileByGlobalTransitId = await getFileHeaderBytesByGlobalTransitId(
          dotYouClient,
          targetDrive,
          id,
          { systemFileType }
        );
        if (fileByGlobalTransitId) return fileByGlobalTransitId;
      })();

      if (!rawFile?.fileMetadata.localAppData) return rawFile;

      try {
        return {
          ...rawFile,
          fileMetadata: {
            ...rawFile.fileMetadata,
            appData: {
              ...rawFile.fileMetadata.appData,
            },
            localAppData: await getLocalContentFromHeader(dotYouClient, targetDrive, rawFile, true),
          },
        };
      } catch {
        return rawFile;
      }
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
  const dotYouClient = useDotYouClientContext();

  const fetchFile = async (result: HomebaseFile | DeletedHomebaseFile, payloadKey?: string) => {
    if (payloadKey) {
      const payload = await getPayloadBytes(dotYouClient, targetDrive, result.fileId, payloadKey, {
        systemFileType: result.fileSystemType,
      });
      if (!payload) return null;

      return window.URL.createObjectURL(
        new Blob([payload.bytes], {
          type: `${
            result.fileMetadata.payloads?.find((payload) => payload.key === payloadKey)?.contentType
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
        console.error('Failed to decrypt file', e);
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
      defaultPayload: await getContentFromHeaderOrPayload(
        dotYouClient,
        targetDrive,
        result,
        includeMetadataHeader,
        result.fileSystemType
      ),
    };

    const stringified = jsonStringify64(exportable);
    const url = window.URL.createObjectURL(
      new Blob([stringified], { type: 'application/json;charset=utf-8' })
    );

    return url;
  };

  const removeFile = async (fileId: string) =>
    await deleteFile(dotYouClient, targetDrive, fileId, undefined, systemFileType);

  return {
    fetchFile: fetchFile,
    deleteFile: useMutation({
      mutationFn: removeFile,
      onSettled: () => {
        invalidateFiles(queryClient, targetDrive, systemFileType);
      },
    }),
  };
};

export const invalidateFiles = (
  queryClient: QueryClient,
  targetDrive: TargetDrive,
  systemFileType?: SystemFileType
) => {
  queryClient.invalidateQueries({
    queryKey: ['files', systemFileType?.toLowerCase() || 'standard', targetDrive.alias],
  });
};
