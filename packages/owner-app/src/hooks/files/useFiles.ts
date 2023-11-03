import { useInfiniteQuery } from '@tanstack/react-query';
import {
  decryptJsonContent,
  decryptKeyHeader,
  DEFAULT_PAYLOAD_KEY,
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
    const reponse = await queryBatch(
      dotYouClient,
      { targetDrive, systemFileType },
      { cursorState: pageParam, maxRecords: pageSize, includeMetadataHeader: includeMetadataHeader }
    );
    return reponse;
  };

  const fetchFile = async (result: DriveSearchResult, payloadOnly?: boolean) => {
    if (result.fileMetadata.contentType !== 'application/json' && payloadOnly) {
      const payload = await getPayloadBytes(
        dotYouClient,
        targetDrive,
        result.fileId,
        DEFAULT_PAYLOAD_KEY,
        {
          keyHeader: result.fileMetadata.isEncrypted
            ? result.sharedSecretEncryptedKeyHeader
            : undefined,
        }
      );
      if (!payload) return null;

      return window.URL.createObjectURL(
        new Blob([payload.bytes], { type: `${result.fileMetadata.contentType};charset=utf-8` })
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

  return {
    fetch: useInfiniteQuery({
      queryKey: ['files', systemFileType || 'Standard', targetDrive.alias],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchFiles({ targetDrive, pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage?.searchResults?.length >= pageSize ? lastPage?.cursorState : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!targetDrive,
    }),
    fetchFile: fetchFile,
  };
};
