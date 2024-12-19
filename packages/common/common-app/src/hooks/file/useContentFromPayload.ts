import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { getPayloadAsJson, TargetDrive } from '@homebase-id/js-lib/core';
import { getPayloadAsJsonOverPeer } from '@homebase-id/js-lib/peer';

export const useContentFromPayload = <T>(props?: {
  odinId?: string;
  targetDrive: TargetDrive;
  fileId: string | undefined;
  payloadKey: string | undefined;
  lastModified?: number;
}) => {
  const { odinId, targetDrive, fileId, payloadKey, lastModified } = props || {};
  const dotYouClient = useDotYouClientContext();

  const fetchContentFromPayload = async (
    odinId: string | undefined,
    targetDrive: TargetDrive,
    fileId: string,
    payloadKey: string,
    lastModified: number | undefined
  ) => {
    if (!odinId || odinId === dotYouClient.getHostIdentity()) {
      return await getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, payloadKey, {
        lastModified,
      });
    }
    return await getPayloadAsJsonOverPeer<T>(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      payloadKey,
      {
        lastModified,
      }
    );
  };

  return useQuery({
    queryKey: [
      'payload-content',
      odinId,
      (targetDrive as TargetDrive)?.alias,
      fileId,
      payloadKey,
      lastModified,
    ],
    queryFn: () =>
      fetchContentFromPayload(
        odinId,
        targetDrive as TargetDrive,
        fileId as string,
        payloadKey as string,
        lastModified
      ),
    enabled: !!targetDrive && !!fileId && !!payloadKey,
    staleTime: 1000 * 60 * 60 * 24 * 14, // 14 Days, the lastModified is used to invalidate the cache
  });
};
