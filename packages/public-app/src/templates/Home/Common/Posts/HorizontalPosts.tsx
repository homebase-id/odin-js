import { SubtleMessage, t } from '@youfoundation/common-app';
import { useChannels } from '@youfoundation/common-app';
import { PostChannelTeaser } from '../PostChannelTeaser/PostChannelTeaser';
import { useAuth } from '../../../../hooks/auth/useAuth';

const HorizontalPosts = () => {
  const { isAuthenticated, isOwner } = useAuth();
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
