import { useEffect, useMemo } from 'react';
import { useCommunityMetadata } from './useCommunityMetadata';
import { useLastUpdatedThreadExcludingMine } from './threads/useCommunityThreads';
import { useCommunityChannelsWithRecentMessages } from './channels/useCommunityChannelsWithRecentMessages';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useOdinClientContext } from '@homebase-id/common-app';
import { useLastUpdatedCommunityMessages } from './messages/useLastUpdatedCommunityMessages';

interface MarkCommunityChannelAsReadProps {
  odinId: string | undefined;
  communityId: string | undefined;
  channelId: string | undefined;
}

interface MarkCommunityThreadsAsReadProps {
  odinId: string | undefined;
  communityId: string | undefined;
  threads: true;
}

export const useMarkCommunityAsRead = ({
  odinId,
  communityId,
  ...props
}: MarkCommunityChannelAsReadProps | MarkCommunityThreadsAsReadProps) => {
  const channelId = (props as MarkCommunityChannelAsReadProps).channelId;
  const threads = (props as MarkCommunityThreadsAsReadProps).threads;
  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();

  const { data: channelsWithRecent } = useCommunityChannelsWithRecentMessages({
    odinId,
    communityId,
  }).fetch;
  const matchedChannel = useMemo(
    () =>
      channelsWithRecent?.find((channel) =>
        stringGuidsEqual(channel.fileMetadata.appData.uniqueId, channelId)
      ),
    [channelsWithRecent, channelId]
  );

  const {
    single: { data: metadata },
    update: { mutate: updateMetadata, status: updateStatus },
  } = useCommunityMetadata({ odinId, communityId });
  const lastUpdate = useLastUpdatedCommunityMessages({ communityId });
  const lastUpdatedThreads =
    (threads && useLastUpdatedThreadExcludingMine({ odinId, communityId })?.lastMessageCreated) ||
    undefined;

  useEffect(() => {
    if (
      !metadata ||
      !lastUpdate ||
      lastUpdate === 0 ||
      updateStatus === 'pending' ||
      updateStatus === 'error' ||
      (!!channelId && !matchedChannel)
    ) {
      return;
    }

    const savedLastReadTimeChannel =
      channelId && metadata?.fileMetadata.appData.content.channelLastReadTime[channelId];
    const channelReadIsUpToDate =
      !matchedChannel?.lastMessage ||
      matchedChannel?.lastMessage.fileMetadata.originalAuthor === loggedInIdentity ||
      (savedLastReadTimeChannel &&
        savedLastReadTimeChannel >= matchedChannel.lastMessage.fileMetadata.created);

    const threadsReadIsUpToDate =
      !lastUpdatedThreads ||
      lastUpdatedThreads <= metadata?.fileMetadata.appData.content.threadsLastReadTime;

    if (channelReadIsUpToDate && threadsReadIsUpToDate) {
      return;
    }

    updateMetadata({
      metadata: {
        ...metadata,

        fileMetadata: {
          ...metadata.fileMetadata,
          appData: {
            ...metadata.fileMetadata.appData,
            content: {
              ...metadata.fileMetadata.appData.content,
              lastReadTime: lastUpdate,
              threadsLastReadTime:
                lastUpdatedThreads ||
                metadata.fileMetadata.appData.content.threadsLastReadTime ||
                0,
              channelLastReadTime:
                matchedChannel && matchedChannel.lastMessage
                  ? {
                    ...metadata.fileMetadata.appData.content.channelLastReadTime,
                    [matchedChannel.fileMetadata.appData.uniqueId as string]:
                      matchedChannel.lastMessage.fileMetadata.created,
                  }
                  : metadata.fileMetadata.appData.content.channelLastReadTime,
            },
          },
        },
      },
    });
  }, [
    updateStatus,
    metadata,
    communityId,
    channelId,
    lastUpdate,
    lastUpdatedThreads,
    matchedChannel,
  ]);
};
