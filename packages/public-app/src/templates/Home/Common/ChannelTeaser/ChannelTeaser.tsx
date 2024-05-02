import { FC } from 'react';
import { Link } from 'react-router-dom';
import { HOME_ROOT_PATH, t, useBlogPostsInfinite } from '@youfoundation/common-app';
import { ChannelDefinitionVm } from '@youfoundation/common-app';

import { Arrow } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';

interface ChannelTeaserProps {
  className?: string;
  channel: HomebaseFile<ChannelDefinitionVm>;
}

const ChannelTeaser: FC<ChannelTeaserProps> = ({ className, channel }) => {
  const { data: blogPosts, isFetched: blogPostsFetched } = useBlogPostsInfinite({
    channelId: channel.fileMetadata.appData.uniqueId,
    // We don't pass the pageSize as it would force another call to the API when fetching the actual first page
  });

  const flattenedPosts = blogPosts ? blogPosts?.pages?.flatMap((page) => page.results) : [];
  if (
    blogPostsFetched &&
    !flattenedPosts?.length &&
    !channel.fileMetadata.appData.content.isCollaborative
  )
    return null;

  const targetHref = `${HOME_ROOT_PATH}posts/${channel.fileMetadata.appData.content.slug ?? '#'}`;

  return (
    <div className={className}>
      <Link to={targetHref}>
        <div className="relative h-full overflow-hidden rounded-lg border-gray-200 border-opacity-60 bg-background px-4 py-4 hover:shadow-md dark:border-gray-800 lg:border lg:px-8 lg:py-16">
          <h1 className="title-font mb-3 text-xl font-medium sm:text-2xl">
            {channel.fileMetadata.appData.content.name}
          </h1>
          {channel.fileMetadata.appData.content.description && (
            <p className="mb-3 leading-relaxed">
              {channel.fileMetadata.appData.content.description}
            </p>
          )}
          <p className="inline-flex items-center text-button">
            {t('See all')}
            <Arrow className="ml-2 h-5 w-5" />
          </p>
        </div>
      </Link>
    </div>
  );
};
export default ChannelTeaser;
