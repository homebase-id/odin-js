import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ApiType,
  DotYouClient,
  DriveSearchResult,
  getPayload,
  getPayloadBytes,
  jsonStringify64,
  queryBatch,
  SystemFileType,
  TargetDrive,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const includeMetadataHeader = true;
const pageSize = 15;

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
      return window.URL.createObjectURL(
        new Blob(
          [
            (
              await getPayloadBytes(
                dotYouClient,
                targetDrive,
                result.fileId,
                result.sharedSecretEncryptedKeyHeader
              )
            ).bytes,
          ],
          { type: `${result.fileMetadata.contentType};charset=utf-8` }
        )
      );
    }

    const exportable = {
      fileId: result.fileId,
      fileMetadata: {
        globalTransitId: result.fileMetadata.globalTransitId,
        contentType: result.fileMetadata.contentType,
        senderOdinId: result.fileMetadata.senderOdinId,
        payloadIsEncrypted: result.fileMetadata.payloadIsEncrypted,
        allowDistribution: result.serverMetadata.allowDistribution,
        accessControlList: result.serverMetadata.accessControlList,
        appData: {
          ...result.fileMetadata.appData,
          jsonContent: undefined,
          previewThumbnail: undefined,
          additionalThumbnails: undefined,
          contentIsComplete: undefined,
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
