import { Helmet } from 'react-helmet-async';

import { useParams } from 'react-router-dom';
import {
  BlogConfig,
  ChannelTemplate,
  GetTargetDriveFromChannelId,
  PostContent,
} from '@youfoundation/js-lib/public';
import { useRef } from 'react';
import {
  AclIcon,
  ChannelDefinitionVm,
  HOME_ROOT_PATH,
  SubtleMessage,
  t,
  useBlogPostsInfinite,
  useDotYouClient,
  useSecurityContext,
} from '@youfoundation/common-app';

import CardPostOverview from '../../../components/Post/Overview/CardPostOverview/CardPostOverview';
import ListPostOverview from '../../../components/Post/Overview/ListPostOverview/ListPostOverview';
import MasonryPostOverview from '../../../components/Post/Overview/MasonryPostOverview/MasonryPostOverview';
import { useChannel } from '@youfoundation/common-app';
import { flattenInfinteData, useIntersection } from '@youfoundation/common-app';
import FollowLink from '../../../components/ConnectionActions/FollowLink/FollowLink';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';
import { LoadingBlock } from '@youfoundation/common-app';
import {
  ApiType,
  DrivePermissionType,
  HomebaseFile,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import PostComposer from '@youfoundation/feed-app/src/components/SocialFeed/PostComposer';

const PAGE_SIZE = 30;
const PostOverview = () => {
  const { channelKey } = useParams();
  const { data: activeChannel } = useChannel(
    channelKey ? { channelSlug: channelKey } : { channelId: BlogConfig.PublicChannelId }
  ).fetch;

  const {
    data,
    hasNextPage: hasMorePosts,
    fetchNextPage,
    isFetchedAfterMount,
    isFetchingNextPage,
    isLoading,
  } = useBlogPostsInfinite({
    channelId: activeChannel?.fileMetadata.appData.uniqueId,
    pageSize: PAGE_SIZE,
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
    ? activeChannel.fileMetadata.appData.content.template === ChannelTemplate.LargeCards
      ? CardPostOverview
      : activeChannel.fileMetadata.appData.content.template === ChannelTemplate.MasonryLayout
        ? MasonryPostOverview
        : ListPostOverview
    : ListPostOverview;

  const blogPosts = flattenInfinteData<HomebaseFile<PostContent>>(
    data,
    PAGE_SIZE,
    (a, b) =>
      (b.fileMetadata.appData.userDate || b.fileMetadata.updated) -
      (a.fileMetadata.appData.userDate || a.fileMetadata.updated)
  );

  const encrypted =
    activeChannel?.serverMetadata?.accessControlList?.requiredSecurityGroup !==
      SecurityGroupType.Anonymous &&
    activeChannel?.serverMetadata?.accessControlList?.requiredSecurityGroup !==
      SecurityGroupType.Authenticated;

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
            <FollowLink className="sm:ml-auto" channel={activeChannel || undefined} />
          </div>

          {activeChannel ? <PublicPostComposer activeChannel={activeChannel} /> : null}

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

const PublicPostComposer = ({
  activeChannel,
}: {
  activeChannel: HomebaseFile<ChannelDefinitionVm>;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const { data: securityContext } = useSecurityContext().fetch;

  const channelDrive =
    activeChannel && activeChannel.fileMetadata.appData.uniqueId
      ? GetTargetDriveFromChannelId(activeChannel.fileMetadata.appData.uniqueId)
      : undefined;

  const hasWriteAccess =
    channelDrive &&
    (dotYouClient.getType() === ApiType.Owner ||
      securityContext?.permissionContext.permissionGroups.some((group) =>
        group.driveGrants.some(
          (driveGrant) =>
            stringGuidsEqual(driveGrant.permissionedDrive.drive.alias, channelDrive.alias) &&
            stringGuidsEqual(driveGrant.permissionedDrive.drive.type, channelDrive.type) &&
            driveGrant.permissionedDrive.permission.includes(DrivePermissionType.Write)
        )
      ));

  if (!hasWriteAccess) return null;

  return (
    <div className="mb-8 max-w-xl">
      <PostComposer
        forcedChannel={activeChannel || undefined}
        className="mb-2 w-full rounded-md border-gray-200 border-opacity-60 bg-background p-4 shadow-sm dark:border-gray-800 lg:border"
      />
    </div>
  );
};

export default PostOverview;
