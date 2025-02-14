import { SystemFileType, TargetDrive, getPayloadBytes } from '@homebase-id/js-lib/core';
import { getPayloadBytesOverPeerByGlobalTransitId } from '@homebase-id/js-lib/peer';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useFile = (props?: { targetDrive: TargetDrive; systemFileType?: SystemFileType }) => {
  const { targetDrive, systemFileType } = props || {};

  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getHostIdentity();

  const fetchFile = async (
    odinId: string | undefined,
    globalTransitId: string | undefined,
    fileId: string,
    payloadKey: string
  ) => {
    if (!fileId || !payloadKey || !targetDrive) return null;

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
