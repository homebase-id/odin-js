import { SystemFileType, TargetDrive, getPayloadAsJson } from '@homebase-id/js-lib/core';
import { LinkPreview } from '@homebase-id/js-lib/media';
import {
  getPayloadAsJsonOverPeer,
  getPayloadAsJsonOverPeerByGlobalTransitId,
} from '@homebase-id/js-lib/peer';
import { useQuery } from '@tanstack/react-query';
import { useOdinClientContext } from '../auth/useOdinClientContext';

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
  const odinClient = useOdinClientContext();

  return useQuery({
    queryKey: ['link-metadata', targetDrive.alias, fileId, payloadKey],
    queryFn: async () => {
      if (odinId && odinClient.getHostIdentity() !== odinId) {
        if (globalTransitId) {
          return getPayloadAsJsonOverPeerByGlobalTransitId<LinkPreview[]>(
            odinClient,
            odinId,
            targetDrive,
            globalTransitId,
            payloadKey,
            {
              systemFileType,
            }
          );
        } else if (fileId) {
          return getPayloadAsJsonOverPeer<LinkPreview[]>(
            odinClient,
            odinId,
            targetDrive,
            fileId,
            payloadKey,
            { systemFileType }
          );
        }
      }

      if (!fileId) return [];
      return getPayloadAsJson<LinkPreview[]>(odinClient, targetDrive, fileId, payloadKey, {
        systemFileType,
      });
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
