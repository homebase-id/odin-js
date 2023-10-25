import { useInfiniteQuery } from '@tanstack/react-query';
import {
  decryptJsonContent,
  decryptKeyHeader,
  DriveSearchResult,
  getPayload,
  getPayloadBytes,
  queryBatch,
  SystemFileType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import useAuth from '../auth/useAuth';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';

const includeMetadataHeader = true;
const pageSize = 300;

const useFiles = ({
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
        result.fileMetadata.payloadIsEncrypted ? result.sharedSecretEncryptedKeyHeader : undefined
      );
      if (!payload) return null;

      return window.URL.createObjectURL(
        new Blob([payload.bytes], { type: `${result.fileMetadata.contentType};charset=utf-8` })
      );
    }

    const decryptedJsonContent =
      result.fileMetadata.appData.jsonContent && result.fileMetadata.payloadIsEncrypted
        ? await decryptJsonContent<Record<string, string>>(
            result.fileMetadata,
            await decryptKeyHeader(dotYouClient, result.sharedSecretEncryptedKeyHeader)
          )
        : result.fileMetadata.appData.jsonContent;

    const exportable = {
      fileId: result.fileId,
      fileMetadata: {
        ...result.fileMetadata,
        appData: {
          ...result.fileMetadata.appData,
          jsonContent: decryptedJsonContent,
        },
      },
      payload:
        result.fileMetadata.contentType === 'application/json'
          ? await getPayload(dotYouClient, targetDrive, result, includeMetadataHeader)
          : await getPayloadBytes(
              dotYouClient,
              targetDrive,
              result.fileId,
              result.fileMetadata.payloadIsEncrypted
                ? result.sharedSecretEncryptedKeyHeader
                : undefined
            ),
    };

    const stringified = jsonStringify64(exportable);
    const url = window.URL.createObjectURL(
      new Blob([stringified], { type: 'application/json;charset=utf-8' })
    );

    return url;
  };

  return {
    fetch: useInfiniteQuery(
      ['files', systemFileType || 'Standard', targetDrive.alias],
      ({ pageParam }) => fetchFiles({ targetDrive, pageParam }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.searchResults?.length >= pageSize && lastPage?.cursorState) || undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!targetDrive,
      }
    ),
    fetchFile: fetchFile,
  };
};

export default useFiles;
