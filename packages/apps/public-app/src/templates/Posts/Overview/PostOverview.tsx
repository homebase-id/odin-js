import { Helmet } from 'react-helmet-async';

import { useParams } from 'react-router-dom';
import {
  BlogConfig,
  ChannelDefinition,
  ChannelTemplate,
  PostContent,
} from '@homebase-id/js-lib/public';
import { useRef } from 'react';
import {
  AclIcon,
  HOME_ROOT_PATH,
  SubtleMessage,
  t,
  usePostsInfinite,
  useChannel,
  flattenInfinteData,
  useIntersection,
  LoadingBlock,
  NotFound,
  BLOG_POST_INFIITE_PAGE_SIZE,
  useOdinClientContext,
} from '@homebase-id/common-app';

import CardPostOverview from '../../../components/Post/Overview/CardPostOverview/CardPostOverview';
import ListPostOverview from '../../../components/Post/Overview/ListPostOverview/ListPostOverview';
import MasonryPostOverview from '../../../components/Post/Overview/MasonryPostOverview/MasonryPostOverview';

import FollowLink from '../../../components/ConnectionActions/FollowLink/FollowLink';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';
import { HomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import { SaveCollaborativeChannelLink } from '../../../components/CollaborativeChannels/SaveCollaborativeChannelLink';
import { PublicPostComposer } from '../../../components/CollaborativeChannels/PublicPostComposer';

const PostOverview = () => {
  const isOwner = useOdinClientContext().isOwner();
  const { channelKey } = useParams();
  const { data: activeChannel, isFetched: channelFetched } = useChannel({
    channelKey: channelKey || BlogConfig.PublicChannelId,
  }).fetch;

  const {
    data,
    hasNextPage: hasMorePosts,
    fetchNextPage,
    isFetchedAfterMount,
    isFetchingNextPage,
    isLoading,
  } = usePostsInfinite({
    channelId: activeChannel?.fileMetadata.appData.uniqueId,
    enabled: !channelKey || !!activeChannel,
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
    ? activeChannel.fileMetadata.appData.content.templateId === ChannelTemplate.LargeCards
      ? CardPostOverview
      : activeChannel.fileMetadata.appData.content.templateId === ChannelTemplate.MasonryLayout
        ? MasonryPostOverview
        : ListPostOverview
    : ListPostOverview;

  const blogPosts = flattenInfinteData<HomebaseFile<PostContent>>(
    data,
    hasMorePosts ? BLOG_POST_INFIITE_PAGE_SIZE : undefined,
    (a, b) =>
      (b.fileMetadata.appData.userDate || b.fileMetadata.updated) -
      (a.fileMetadata.appData.userDate || a.fileMetadata.updated)
  );

  const encrypted =
    activeChannel?.serverMetadata?.accessControlList?.requiredSecurityGroup !==
      SecurityGroupType.Anonymous &&
    activeChannel?.serverMetadata?.accessControlList?.requiredSecurityGroup !==
      SecurityGroupType.Authenticated;

  if (channelFetched && !activeChannel) return <NotFound />;

  return (
    <>
      <Helmet>
        <title>
          {activeChannel ? activeChannel.fileMetadata.appData.content.name : t('Posts')} | Homebase
        </title>
      </Helmet>

      <section className="py-5">
        <div className="container mx-auto px-2 sm:px-5">
          <div className="mb-8 flex flex-col items-center sm:flex-row">
            <div>
              <Breadcrumbs
                levels={[
                  { title: t('Posts') ?? '', href: `${HOME_ROOT_PATH}posts` },
                  { title: activeChannel?.fileMetadata.appData.content.name ?? '' },
                ]}
                className="text-sm"
              />

              <h1 className="text-4xl" title={encrypted ? t('Encrypted') : t('Unencrypted')}>
                {activeChannel?.fileMetadata.appData.content.name}{' '}
                {activeChannel?.serverMetadata?.accessControlList ? (
                  <AclIcon
                    acl={activeChannel?.serverMetadata?.accessControlList}
                    className="inline h-3 w-3"
                  />
                ) : null}{' '}
              </h1>
              <p className="my-2 max-w-md text-foreground text-opacity-80">
                {activeChannel?.fileMetadata.appData.content.description}
              </p>
            </div>
            {activeChannel ? (
              <div className="flex flex-row gap-2 sm:ml-auto">
                <FollowLink
                  className="sm:ml-auto"
                  channel={(activeChannel as HomebaseFile<ChannelDefinition>) || undefined}
                />
                <SaveCollaborativeChannelLink
                  channel={(activeChannel as HomebaseFile<ChannelDefinition>) || undefined}
                />
              </div>
            ) : null}
          </div>

          {activeChannel ? (
            <PublicPostComposer
              activeChannel={(activeChannel as HomebaseFile<ChannelDefinition>) || undefined}
            />
          ) : null}

          {isLoading ? (
            <>
              <LoadingBlock className="my-2 h-24 w-full bg-background" />
              <LoadingBlock className="my-2 h-24 w-full bg-background" />
              <LoadingBlock className="my-2 h-24 w-full bg-background" />
            </>
          ) : blogPosts?.length && (!channelKey || activeChannel) ? (
            <ListComponent
              blogPosts={blogPosts}
              showAuthor={activeChannel?.fileMetadata.appData.content.isCollaborative || false}
              showChannel={activeChannel?.fileMetadata.appData.content.isCollaborative || isOwner}
            />
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
