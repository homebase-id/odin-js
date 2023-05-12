import { t } from '@youfoundation/common-app';
import { useChannels } from '@youfoundation/common-app';
import { PostChannelTeaser } from '../PostChannelTeaser/PostChannelTeaser';
import useAuth from '../../../../hooks/auth/useAuth';

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
            key={channel.channelId}
            title={channel.name}
            channel={channel}
            fallback={
              index === 0 ? (
                <p className="text-slate-400">{t('Nothing has been posted yet')}</p>
              ) : null
            }
          />
        );
      })}
    </>
  );
};

export default HorizontalPosts;
