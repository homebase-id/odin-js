import { useInboxProcessor } from './useInboxProcessor';
import { useCommunityPeerWebsocket } from './useCommunityPeerWebsocket';
import { useCommunityWebsocket } from './useCommunityWebsocket';

// We first process the inbox, then we connect for live updates;
export const useLiveCommunityProcessor = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  // Connect to the local community websocket
  useCommunityWebsocket(odinId, communityId);

  // Process the inbox on startup; As we want to cover the backlog of messages first
  const { status: inboxStatus } = useInboxProcessor(odinId, communityId || '');

  // Only after the inbox is processed, we connect for live remote updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useCommunityPeerWebsocket(odinId, communityId, inboxStatus === 'success');

  return isOnline;
};
