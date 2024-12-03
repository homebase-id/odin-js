import { useCommunityInboxProcessor } from './useCommunityInboxProcessor';
import { useChatInboxProcessor } from '@homebase-id/chat-app/src/hooks/chat/live/useChatInboxProcessor';

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
  const { status: communityInboxStatus } = useCommunityInboxProcessor(odinId, communityId || '');
  const { status: chatInboxStatus } = useChatInboxProcessor(true);

  // Only after the inbox is processed, we connect for live remote updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useCommunityPeerWebsocket(
    odinId,
    communityId,
    communityInboxStatus === 'success' && chatInboxStatus === 'success'
  );

  return isOnline;
};
