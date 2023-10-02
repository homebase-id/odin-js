import { Helmet } from 'react-helmet-async';

import { useParams } from 'react-router-dom';
import { BlogConfig, ChannelTemplate, PostContent, PostFile } from '@youfoundation/js-lib/public';
import { useRef } from 'react';
import {
  HOME_ROOT_PATH,
  Lock,
  SubtleMessage,
  t,
  useBlogPostsInfinite,
} from '@youfoundation/common-app';

import CardPostOverview from '../../../components/Post/Overview/CardPostOverview/CardPostOverview';
import ListPostOverview from '../../../components/Post/Overview/ListPostOverview/ListPostOverview';
import MasonryPostOverview from '../../../components/Post/Overview/MasonryPostOverview/MasonryPostOverview';
import { useChannel } from '@youfoundation/common-app';
import { flattenInfinteData, useIntersection } from '@youfoundation/common-app';
import FollowLink from '../../../components/ConnectionActions/FollowLink/FollowLink';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';
import { LoadingBlock } from '@youfoundation/common-app';
import { SecurityGroupType } from '@youfoundation/js-lib/core';

const PAGE_SIZE = 10;
const PostOverview = () => {
  const { channelKey } = useParams();
  const { data: activeChannel } = useChannel(
    channelKey ? { channelSlug: channelKey } : { channelId: BlogConfig.PublicChannel.channelId }
  ).fetch;

  const {
    data,
    hasNextPage: hasMorePosts,
    fetchNextPage,
    isFetchedAfterMount,
    isFetchingNextPage,
    isLoading,
  } = useBlogPostsInfinite({
    channelId: activeChannel?.channelId,
    pageSize: PAGE_SIZE,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersection(
    hasMorePosts ? loadMoreRef : undefined,
    () => {
      fetchNextPage();
    },
    true
  );

  const ListComponent = activeChannel
    ? activeChannel.template === ChannelTemplate.LargeCards
      ? CardPostOverview
      : activeChannel.template === ChannelTemplate.MasonryLayout
      ? MasonryPostOverview
      : ListPostOverview
    : ListPostOverview;

  const blogPosts = flattenInfinteData<PostFile<PostContent>>(
    data,
    PAGE_SIZE,
    (a, b) => b.content.dateUnixTime - a.content.dateUnixTime
  );

  return (
    <>
      <Helmet>
        <title>{activeChannel ? activeChannel.name : t('Posts')} | Homebase</title>
      </Helmet>

      <section className="py-5">
        <div className="container mx-auto px-2 sm:px-5">
          <div className="mb-8 flex flex-col items-center sm:flex-row">
            <div>
              <Breadcrumbs
                levels={[
                  { title: t('Posts') ?? '', href: `${HOME_ROOT_PATH}posts` },
                  { title: activeChannel?.name ?? '' },
                ]}
                className="text-sm"
              />

              <h1 className="text-4xl">{activeChannel?.name}</h1>
              <p className="my-2 max-w-md text-foreground text-opacity-80">
                {activeChannel?.acl?.requiredSecurityGroup !== SecurityGroupType.Anonymous &&
                activeChannel?.acl?.requiredSecurityGroup !== SecurityGroupType.Authenticated ? (
                  <Lock className="inline h-3 w-3" />
                ) : null}{' '}
                {activeChannel?.description}
              </p>
            </div>
            <FollowLink className="sm:ml-auto" channel={activeChannel || undefined} />
          </div>
          {isLoading ? (
            <>
              <LoadingBlock className="my-2 h-24 w-full bg-background" />
              <LoadingBlock className="my-2 h-24 w-full bg-background" />
              <LoadingBlock className="my-2 h-24 w-full bg-background" />
            </>
          ) : blogPosts?.length && (!channelKey || activeChannel) ? (
            <ListComponent blogPosts={blogPosts} />
          ) : (
            <SubtleMessage>{t('Nothing has been posted yet')}</SubtleMessage>
          )}

          <div ref={loadMoreRef} className="h-1 w-full"></div>
          {!hasMorePosts && blogPosts?.length && isFetchedAfterMount ? (
            <div className="mt-5 italic opacity-50" key={'no-more'}>
              {t('No more posts')}
            </div>
          ) : null}
          {isFetchingNextPage && (
            <div className="mt-5 animate-pulse" key={'loading'}>
              {t('Loading...')}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default PostOverview;
