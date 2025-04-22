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
import { useOdinClientContext } from '@homebase-id/common-app';

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
  const odinClient = useOdinClientContext();

  const fetchFiles = async ({
    targetDrive,
    pageParam,
  }: {
    targetDrive: TargetDrive;
    pageParam: string | undefined;
  }) => {
    const response = await queryBatch(
      odinClient,
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
  const odinClient = useOdinClientContext();

  return useQuery({
    queryKey: ['file', targetDrive?.alias, id],
    queryFn: async () => {
      if (!id || !targetDrive) return null;

      const queryFile = async (decrypt = true) => {
        // Search by fileId
        const fileByFileId = await getFileHeader(odinClient, targetDrive, id, {
          systemFileType,
          decrypt,
        });
        if (fileByFileId) return fileByFileId;

        // Search by uniqueId
        const fileByUniqueId = await getFileHeaderByUniqueId(odinClient, targetDrive, id, {
          systemFileType,
          decrypt,
        });
        if (fileByUniqueId) return fileByUniqueId;

        // Search by globalTransitId
        const fileByGlobalTransitId = await getFileHeaderBytesByGlobalTransitId(
          odinClient,
          targetDrive,
          id,
          { systemFileType }
        );
        if (fileByGlobalTransitId) return fileByGlobalTransitId;
      };

      try {
        const decryptedFile = await queryFile();

        if (!decryptedFile?.fileMetadata.localAppData) return decryptedFile;
        try {
          return {
            ...decryptedFile,
            fileMetadata: {
              ...decryptedFile.fileMetadata,
              appData: {
                ...decryptedFile.fileMetadata.appData,
              },
              localAppData: await getLocalContentFromHeader(
                odinClient,
                targetDrive,
                decryptedFile,
                true
              ),
            },
          };
        } catch {
          //
        }

        return decryptedFile;
      } catch (e) {
        console.warn('Failed to decrypt file', e);
        const encryptedFile = await queryFile(false);
        return encryptedFile;
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
  const odinClient = useOdinClientContext();

  const fetchFile = async (result: HomebaseFile | DeletedHomebaseFile, payloadKey?: string) => {
    if (payloadKey) {
      const payload = await getPayloadBytes(odinClient, targetDrive, result.fileId, payloadKey, {
        systemFileType: result.fileSystemType,
      });
      if (!payload) return null;

      return window.URL.createObjectURL(
        new Blob([payload.bytes], {
          type: `${result.fileMetadata.payloads?.find((payload) => payload.key === payloadKey)?.contentType
            };charset=utf-8`,
        })
      );
    }

    const decryptedJsonContent = await (async () => {
      try {
        return result.fileMetadata.appData.content && result.fileMetadata.isEncrypted
          ? await decryptJsonContent(
            result.fileMetadata,
            await decryptKeyHeader(odinClient, result.sharedSecretEncryptedKeyHeader)
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
        odinClient,
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
    await deleteFile(odinClient, targetDrive, fileId, undefined, systemFileType);

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
