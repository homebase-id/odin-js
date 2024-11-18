import { COMMUNITY_ROOT_PATH, useDotYouClient } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useMemo, useEffect } from 'react';
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
  const identity = useDotYouClient().getIdentity();
  const { odinKey, communityKey, channelKey, threadKey } = useParams();

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

  const navigate = useNavigate();
  useEffect(() => {
    if ((threadKey && !origin) || (!threadKey && origin)) return;

    const myLastMessage = flattenedMsgs.find((msg) => msg.fileMetadata.originalAuthor === identity);

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey)) {
        console.log('myLastMessage', myLastMessage);
        navigate(
          `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey}/${threadKey ? `${threadKey}/thread/` : ``}${myLastMessage?.fileMetadata.appData.uniqueId}/edit`
        );
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flattenedMsgs, threadKey]);
};
