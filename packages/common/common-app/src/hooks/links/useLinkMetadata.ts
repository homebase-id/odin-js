import { SystemFileType, TargetDrive, getPayloadAsJson } from '@homebase-id/js-lib/core';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { getPayloadAsJsonOverPeerByGlobalTransitId } from '@homebase-id/js-lib/peer';
import { useDotYouClient } from '../auth/useDotYouClient';
import { useQuery } from '@tanstack/react-query';

export const useLinkMetadata = ({
  odinId,
  globalTransitId,
  targetDrive,
  fileId,
  payloadKey,
  systemFileType,
}: {
  odinId?: string;
  globalTransitId?: string;
  targetDrive: TargetDrive;
  fileId?: string;
  payloadKey: string;
  systemFileType?: SystemFileType;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return useQuery({
    queryKey: ['link-metadata', targetDrive.alias, fileId, payloadKey],
    queryFn: async () => {
      if (odinId && globalTransitId) {
        return getPayloadAsJsonOverPeerByGlobalTransitId<LinkPreview[]>(
          dotYouClient,
          odinId,
          targetDrive,
          globalTransitId,
          payloadKey,
          {
            systemFileType,
          }
        );
      }

      if (!fileId) return [];
      return getPayloadAsJson<LinkPreview[]>(dotYouClient, targetDrive, fileId, payloadKey, {
        systemFileType,
      });
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
