import { TargetDrive, getPayloadBytes } from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../auth/useDotYouClient';
import { getPayloadBytesOverPeer } from '@youfoundation/js-lib/peer';

export const useFile = ({ targetDrive }: { targetDrive: TargetDrive }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const identity = dotYouClient.getIdentity();

  const fetchFile = async (odinId: string | undefined, fileId: string, payloadKey?: string) => {
    if (!fileId || !payloadKey) return null;

    const isLocal = !odinId || odinId === identity;

    const payload = !isLocal
      ? await getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, payloadKey, {
          decrypt: true,
        })
      : await getPayloadBytes(dotYouClient, targetDrive, fileId, payloadKey, { decrypt: true });
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
