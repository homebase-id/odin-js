import { useEffect } from 'react';
import { useCommunityMetadata } from './useCommunityMetadata';
import { useLastUpdatedChatMessages } from './messages/useCommunityMessages';

export const useMarkCommunityAsRead = ({
  odinId,
  communityId,
  channelId,
}: {
  odinId: string | undefined;
  communityId: string | undefined;
  channelId?: string;
}) => {
  const {
    single: { data: metadata },
    update: { mutate: updateMetadata, status: updateStatus },
  } = useCommunityMetadata({ odinId, communityId });
  const { lastUpdate } = useLastUpdatedChatMessages();

  useEffect(() => {
    if (
      !metadata ||
      !lastUpdate ||
      lastUpdate === 0 ||
      updateStatus === 'pending' ||
      updateStatus === 'error'
    )
      return;

    const savedLastReadTime = metadata?.fileMetadata.appData.content.lastReadTime;
    const savedLastReadTimeChannel =
      metadata?.fileMetadata.appData.content.channelLastReadTime[channelId || ''];

    if (
      savedLastReadTime &&
      savedLastReadTime >= lastUpdate &&
      (!channelId || (savedLastReadTimeChannel && savedLastReadTimeChannel >= lastUpdate))
    )
      return;

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
  }, [updateStatus, metadata, communityId, channelId, lastUpdate]);
};
