import { t } from '@youfoundation/common-app';
import useChannels from '../../../../hooks/blog/useChannels';
import { PostChannelTeaser } from '../PostChannelTeaser/PostChannelTeaser';

const HorizontalPosts = () => {
  const { data: channels } = useChannels();

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
