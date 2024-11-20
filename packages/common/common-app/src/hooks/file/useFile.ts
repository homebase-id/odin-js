import { SystemFileType, TargetDrive, getPayloadBytes } from '@homebase-id/js-lib/core';
import { useDotYouClient } from '../auth/useDotYouClient';
import { getPayloadBytesOverPeerByGlobalTransitId } from '@homebase-id/js-lib/peer';

export const useFile = ({
  targetDrive,
  systemFileType,
}: {
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const identity = dotYouClient.getHostIdentity();

  const fetchFile = async (
    odinId: string | undefined,
    globalTransitId: string | undefined,
    fileId: string,
    payloadKey?: string
  ) => {
    if (!fileId || !payloadKey) return null;

    const isLocal = !odinId || odinId === identity;

    const payload = !isLocal
      ? globalTransitId
        ? await getPayloadBytesOverPeerByGlobalTransitId(
            dotYouClient,
            odinId,
            targetDrive,
            globalTransitId,
            payloadKey,
            {
              systemFileType,
              decrypt: true,
            }
          )
        : await getPayloadBytesOverPeerByGlobalTransitId(
            dotYouClient,
            odinId,
            targetDrive,
            fileId,
            payloadKey,
            {
              systemFileType,
              decrypt: true,
            }
          )
      : await getPayloadBytes(dotYouClient, targetDrive, fileId, payloadKey, {
          systemFileType,
          decrypt: true,
        });
    if (!payload) return null;

    return window.URL.createObjectURL(
      new Blob([payload.bytes], {
        type: `${payload.contentType};charset=utf-8`,
      })
    );
  };

  return {
    fetchFile: fetchFile,
  };
};
