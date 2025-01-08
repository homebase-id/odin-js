import { useEffect, useMemo } from 'react';
import { useCommunityMetadata } from './useCommunityMetadata';
import { useLastUpdatedChatMessages } from './messages/useCommunityMessages';
import { useLastUpdatedThreadExcludingMine } from './threads/useCommunityThreads';
import { useCommunityChannelsWithRecentMessages } from './channels/useCommunityChannelsWithRecentMessages';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

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
  const { lastUpdate } = useLastUpdatedChatMessages({ communityId });
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

    const savedLastReadTime = metadata?.fileMetadata.appData.content.lastReadTime;
    const lastReadIsUpToDate = savedLastReadTime && savedLastReadTime >= lastUpdate;

    const savedLastReadTimeChannel =
      channelId && metadata?.fileMetadata.appData.content.channelLastReadTime[channelId];
    const channelReadIsUpToDate =
      !matchedChannel?.lastMessage ||
      (savedLastReadTimeChannel &&
        savedLastReadTimeChannel >= matchedChannel.lastMessage.fileMetadata.created);

    const threadsReadIsUpToDate =
      !lastUpdatedThreads ||
      lastUpdatedThreads <= metadata?.fileMetadata.appData.content.threadsLastReadTime;

    if (lastReadIsUpToDate && channelReadIsUpToDate && threadsReadIsUpToDate) {
      // console.log('no need to update read time', {
      //   matchedChannel,
      //   created: matchedChannel?.lastMessage?.fileMetadata.created,
      //   savedLastReadTimeChannel,
      // });
      return;
    }

    // console.log('marking as read', {
    //   lastReadTime: lastUpdate || undefined,
    //   threadsLastReadTime: lastUpdatedThreads || undefined,
    //   channelLastReadTime:
    //     matchedChannel && matchedChannel.lastMessage
    //       ? {
    //           ...metadata.fileMetadata.appData.content.channelLastReadTime,
    //           [matchedChannel.fileMetadata.appData.uniqueId as string]:
    //             matchedChannel.lastMessage.fileMetadata.created,
    //         }
    //       : undefined,
    // });
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
