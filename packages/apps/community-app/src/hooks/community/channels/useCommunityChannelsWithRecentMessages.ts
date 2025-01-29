import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { useCommunityChannels } from './useCommunityChannels';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { useEffect } from 'react';
import { getCommunityMessagesInfiniteQueryOptions } from '../messages/useCommunityMessages';
import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { useLastUpdatedCommunityMessages } from '../messages/useLastUpdatedCommunityMessages';

export type ChannelWithRecentMessage = HomebaseFile<CommunityChannel> & {
  lastMessage: HomebaseFile<CommunityMessage> | null;
};

export const useCommunityChannelsWithRecentMessages = (props: {
  odinId?: string;
  communityId?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const queryKey = ['channels-with-recent-message', formatGuidId(props.communityId)];

  const {
    data: channels,
    isFetched,
    dataUpdatedAt: channelsUpdatedAt,
  } = useCommunityChannels(props).fetch;

  const messgesUpdatedAt = useLastUpdatedCommunityMessages({ communityId: props.communityId });
  useEffect(() => {
    if (messgesUpdatedAt === null || !isFetched || !channels || !channels.length) {
      return;
    }

    const currentCacheUpdate = queryClient.getQueryState<ChannelWithRecentMessage[]>(queryKey);
    if (
      currentCacheUpdate?.data?.length === channels.length &&
      currentCacheUpdate?.dataUpdatedAt &&
      messgesUpdatedAt !== 0 &&
      messgesUpdatedAt <= currentCacheUpdate?.dataUpdatedAt &&
      channelsUpdatedAt <= currentCacheUpdate?.dataUpdatedAt
    ) {
      return;
    }

    (async () => {
      const convoWithMessage: ChannelWithRecentMessage[] = await Promise.all(
        channels.map(async (chnl) => {
          const chnlId = chnl.fileMetadata.appData.uniqueId;
          const messagesA = await queryClient.fetchInfiniteQuery(
            getCommunityMessagesInfiniteQueryOptions(
              dotYouClient,
              props.odinId,
              props.communityId,
              chnlId,
              undefined
            )
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

      queryClient.setQueryData(queryKey, convoWithMessage, {
        updatedAt: Date.now(),
      });
    })();
  }, [props, messgesUpdatedAt, channels, channelsUpdatedAt]);

  return {
    // We only setup a cache entry that we will fill up with the setQueryData later; So we can cache the data for offline and faster startup;
    fetch: useQuery({
      queryKey: queryKey,
      queryFn: () => [] as ChannelWithRecentMessage[],
      staleTime: Infinity,
    }),
  };
};
