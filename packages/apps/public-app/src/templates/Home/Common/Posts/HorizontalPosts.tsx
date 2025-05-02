import { SubtleMessage, t, useOdinClientContext } from '@homebase-id/common-app';
import { useChannels } from '@homebase-id/common-app';
import { PostChannelTeaser } from '../PostChannelTeaser/PostChannelTeaser';

const HorizontalPosts = () => {
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();

  const { data: channels } = useChannels({ isAuthenticated, isOwner });

  if (!channels?.length) {
    return null;
  }

  return (
    <>
      {channels.map((channel, index) => {
        return (
          <PostChannelTeaser
            key={channel.fileMetadata.appData.uniqueId}
            title={channel.fileMetadata.appData.content.name}
            channel={channel}
            fallback={
              index === 0 ? <SubtleMessage>{t('Nothing has been posted yet')}</SubtleMessage> : null
            }
          />
        );
      })}
    </>
  );
};

export default HorizontalPosts;
