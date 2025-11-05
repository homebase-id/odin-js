import { useQuery } from '@tanstack/react-query';
import { getPayloadAsJson, type TargetDrive } from '@homebase-id/js-lib/core';
import { PostContent } from '@homebase-id/js-lib/public';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';
import { getPayloadAsJsonOverPeerByGlobalTransitId } from '@homebase-id/js-lib/peer';

export const usePostBody = ({
  targetDrive,
  fileId,
  payloadKey,
  enabled,
  odinId,
  globalTransitId,
  headerPostContent,
}: {
  targetDrive: TargetDrive;
  headerPostContent?: PostContent;
  fileId?: string;
  globalTransitId?: string;
  payloadKey: string;
  odinId?: string;
  enabled?: boolean;
}) => {
  const dotyouClient = useDotYouClientContext();
  async function fetchFullTextPayload() {
    if (!fileId || !payloadKey) {
      return null;
    }

    const payloadData =
      odinId && globalTransitId
        ? await getPayloadAsJsonOverPeerByGlobalTransitId<PostContent>(
            dotyouClient,
            odinId,
            targetDrive,
            globalTransitId,
            payloadKey
          )
        : await getPayloadAsJson<PostContent>(dotyouClient, targetDrive, fileId, payloadKey);
    if (!payloadData) {
      return null;
    }

    return { ...headerPostContent, ...payloadData };
  }

  return useQuery({
    queryKey: ['post-body', targetDrive?.alias, fileId, payloadKey],
    queryFn: fetchFullTextPayload,
    enabled: !!enabled && !!fileId && !!payloadKey && !!targetDrive,
  });
};
