import { SystemFileType, TargetDrive, getPayloadBytes } from '@homebase-id/js-lib/core';
import { getPayloadBytesOverPeerByGlobalTransitId } from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useFile = (props?: { targetDrive: TargetDrive; systemFileType?: SystemFileType }) => {
  const { targetDrive, systemFileType } = props || {};

  const odinClient = useOdinClientContext();
  const identity = odinClient.getHostIdentity();

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
          odinClient,
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
          odinClient,
          odinId,
          targetDrive,
          fileId,
          payloadKey,
          {
            systemFileType,
            decrypt: true,
          }
        )
      : await getPayloadBytes(odinClient, targetDrive, fileId, payloadKey, {
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
