import { useEffect } from 'react';
import { usecommunityMetadata } from './useCommunityMetadata';
import { useLastUpdatedChatMessages } from './messages/useCommunityMessages';

export const useMarkCommunityAsRead = ({
  communityId,
  channelId,
}: {
  communityId?: string;
  channelId?: string;
}) => {
  const {
    single: { data: metadata },
    update: { mutate: updateMetadata },
  } = usecommunityMetadata({ communityId });
  const { lastUpdate } = useLastUpdatedChatMessages();

  useEffect(() => {
    if (!metadata || !lastUpdate || lastUpdate === 0) return;

    const savedLastReadTime = metadata?.fileMetadata.appData.content.lastReadTime;
    const savedLastReadTimeChannel =
      metadata?.fileMetadata.appData.content.channelLastReadTime[channelId || ''];
    if (
      savedLastReadTime &&
      savedLastReadTime >= lastUpdate &&
      (!savedLastReadTimeChannel ||
        (savedLastReadTimeChannel && savedLastReadTimeChannel >= lastUpdate))
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
  }, [metadata, communityId, channelId, lastUpdate]);
};
