import { FC } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../../../helpers/i18n/dictionary';
import { ChannelDefinitionVm } from '../../../../hooks/blog/useChannels';

import { Arrow } from '@youfoundation/common-app';
import useBlogPosts from '../../../../hooks/blog/useBlogPosts';

interface ChannelTeaserProps {
  className?: string;
  channel: ChannelDefinitionVm;
}

const ChannelTeaser: FC<ChannelTeaserProps> = ({ className, channel }) => {
  const { data: blogPosts, isFetched: blogPostsFetched } = useBlogPosts({
    channelId: channel.channelId,
    pageSize: 1,
  });

  const targetHref = `/home/posts/${channel.slug ?? '#'}`;

  if (blogPostsFetched && !blogPosts?.length) {
    return null;
  }

  return (
    <div className={className}>
      <Link to={targetHref}>
        <div className="relative h-full overflow-hidden rounded-lg border-gray-200 border-opacity-60 bg-background px-4 py-4 dark:border-gray-800 lg:border lg:px-8 lg:py-16">
          <h1 className="title-font mb-3 text-xl font-medium sm:text-2xl">{channel.name}</h1>
          {channel.description && <p className="mb-3 leading-relaxed">{channel.description}</p>}
          <p className="inline-flex items-center text-button">
            {t('See all')}
            <Arrow className="ml-2 h-4 w-4" />
          </p>
        </div>
      </Link>
    </div>
  );
};
export default ChannelTeaser;
