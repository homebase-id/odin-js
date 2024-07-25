import { useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { useCommunityChannels } from './useCommunityChannels';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { useCallback, useEffect, useState } from 'react';
import {
  getCommunityMessagesInfiniteQueryOptions,
  useLastUpdatedChatMessages,
} from '../messages/useCommunityMessages';

export type ChannelWithRecentMessage = HomebaseFile<CommunityChannel> & {
  lastMessage: HomebaseFile<CommunityMessage> | null;
};

export const useCommunityChannelsWithRecentMessages = (props: { communityId?: string }) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { data: channels, ...rest } = useCommunityChannels(props).fetch;

  const [channelsWithRecent, setChannelsWithRecent] = useState<ChannelWithRecentMessage[]>([]);

  const buildChannelsWithRecent = useCallback(async () => {
    if (!channels || !channels || channels.length === 0) {
      return channels;
    }

    const convoWithMessage: ChannelWithRecentMessage[] = await Promise.all(
      channels.map(async (chnl) => {
        const chnlId = chnl.fileMetadata.appData.uniqueId;
        const messagesA = await queryClient.fetchInfiniteQuery(
          getCommunityMessagesInfiniteQueryOptions(dotYouClient, props.communityId, chnlId)
        );
        return {
          ...chnl,
          lastMessage: messagesA.pages[0].searchResults[0],
        };
      })
    );

    convoWithMessage.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return b.lastMessage.fileMetadata.created - a.lastMessage.fileMetadata.created;
    });
    setChannelsWithRecent(convoWithMessage);
  }, [channels, dotYouClient, queryClient]);

  const { lastUpdate } = useLastUpdatedChatMessages();
  useEffect(() => {
    if (!lastUpdate) return;
    buildChannelsWithRecent();
  }, [lastUpdate, buildChannelsWithRecent]);

  return {
    fetch: {
      ...rest,
      data: channelsWithRecent,
    },
  };
};
