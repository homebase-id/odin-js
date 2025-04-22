import { COMMUNITY_ROOT_PATH, useOdinClientContext } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { useCommunityMessages } from './useCommunityMessages';

export const useEditLastMessageShortcut = ({
  community,
  channel,
  origin,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  origin?: HomebaseFile<CommunityMessage>;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const { odinKey, communityKey, channelKey, threadKey } = useParams();
  const navigate = useNavigate();

  const {
    all: { data: messages },
  } = useCommunityMessages({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata?.appData?.uniqueId,
    channelId: channel?.fileMetadata?.appData?.uniqueId,
    threadId: origin?.fileMetadata.globalTransitId,
  });

  const flattenedMsgs =
    useMemo(() => {
      const flat = (messages?.pages?.flatMap((page) => page?.searchResults)?.filter(Boolean) ||
        []) as HomebaseFile<CommunityMessage>[];

      return flat;
    }, [messages, origin]) || [];

  const handler = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey)) {
        const myLastMessage = flattenedMsgs.find(
          (msg) => msg.fileMetadata.originalAuthor === loggedOnIdentity
        );
        if (!myLastMessage) return;
        navigate(
          `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || 'activity'}/${threadKey ? `${threadKey}/thread/` : ``}${myLastMessage?.fileMetadata.appData.uniqueId}/edit`
        );
      }
    },
    [flattenedMsgs, threadKey]
  );

  if (!messages || (threadKey && !origin) || (!threadKey && origin)) return;
  return handler;
};
