import { useEffect } from 'react';
import { useCommunityMetadata } from './useCommunityMetadata';
import { useLastUpdatedChatMessages } from './messages/useCommunityMessages';
import { useLastUpdatedThreadExcludingMine } from './threads/useCommunityThreads';

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
      updateStatus === 'error'
    ) {
      return;
    }

    const savedLastReadTime = metadata?.fileMetadata.appData.content.lastReadTime;
    const savedLastReadTimeChannel =
      metadata?.fileMetadata.appData.content.channelLastReadTime[channelId || ''];

    if (
      savedLastReadTime &&
      savedLastReadTime >= lastUpdate &&
      (!channelId || (savedLastReadTimeChannel && savedLastReadTimeChannel >= lastUpdate)) &&
      (!lastUpdatedThreads ||
        lastUpdatedThreads <= metadata?.fileMetadata.appData.content.threadsLastReadTime)
    ) {
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
              channelLastReadTime: channelId
                ? {
                    ...metadata.fileMetadata.appData.content.channelLastReadTime,
                    [channelId || '']: lastUpdate,
                  }
                : metadata.fileMetadata.appData.content.channelLastReadTime,
            },
          },
        },
      },
    });
  }, [updateStatus, metadata, communityId, channelId, lastUpdate, lastUpdatedThreads]);
};
