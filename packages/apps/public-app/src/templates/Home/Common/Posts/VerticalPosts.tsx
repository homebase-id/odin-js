import { Virtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { PostContent } from '@homebase-id/js-lib/public';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BLOG_POST_INFIITE_PAGE_SIZE,
  HOME_ROOT_PATH,
  Label,
  SubtleMessage,
  usePostsInfinite,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { Select } from '@homebase-id/common-app';
import { flattenInfinteData } from '@homebase-id/common-app';
import { t } from '@homebase-id/common-app';
import { useChannels } from '@homebase-id/common-app';
import ChannelTeaser from '../ChannelTeaser/ChannelTeaser';
import { LoadingBlock } from '@homebase-id/common-app';
import { PostTeaser } from '@homebase-id/common-app';
import LoginDialog from '../../../../components/Dialog/LoginDialog/LoginDialog';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useNavigate } from 'react-router-dom';

const VerticalPosts = ({ className }: { className?: string }) => {
  return (
    <div className={className ?? ''}>
      <div className="grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-5 xl:grid-cols-6">
        <ChannelSidebar className="lg:order-2 lg:col-span-2" />
        <MainVerticalPosts className="lg:col-span-3" />
      </div>
    </div>
  );
};

const ChannelSidebar = ({ className }: { className: string }) => {
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();

  const navigate = useNavigate();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });
  if (!channels?.length || channels.length === 1) return null;

  return (
    <div className={className}>
      <div className="hidden grid-flow-row gap-4 lg:grid">
        {channels?.map((channel) => {
          return (
            <ChannelTeaser
              key={channel.fileMetadata.appData.uniqueId}
              channel={channel}
              className={'w-full'}
            />
          );
        })}
      </div>
      <div className="lg:hidden">
        <Label>{t('Channel')}:</Label>
        <Select
          defaultValue={'all'}
          onChange={(e) => {
            const channel = channels?.find((chnl) =>
              stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, e.target.value)
            );
            if (!channel) return;
            const targetHref = `${HOME_ROOT_PATH}posts/${channel.fileMetadata.appData.content.slug ?? '#'}`;

            navigate(targetHref);
          }}
          className="border border-gray-200 border-opacity-60 py-4 dark:border-gray-800"
        >
          <option value="all">{t('All channels')}</option>
          {channels?.map((channel) => (
            <option
              value={channel.fileMetadata.appData.uniqueId}
              key={channel.fileMetadata.appData.uniqueId}
            >
              {channel.fileMetadata.appData.content.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};

// Docs for combination of Virtual and infinite:
// https://tanstack.com/virtual/v3/docs/examples/react/infinite-scroll
const MainVerticalPosts = ({ className, channelId }: { className: string; channelId?: string }) => {
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });
  const showAuthor =
    !!channels?.find(
      (channel) =>
        channel.fileMetadata.appData.content.isCollaborative &&
        channel.fileMetadata.appData.content.showOnHomePage
    ) || false;

  const [isLogin, setIsLogin] = useState(false);

  const {
    data: blogPosts,
    hasNextPage: hasMorePosts,
    fetchNextPage,
    isFetchingNextPage,
    isFetched: isPostsLoaded,
  } = usePostsInfinite({ channelId: channelId });
  const flattenedPosts = flattenInfinteData<HomebaseFile<PostContent>>(
    blogPosts,
    BLOG_POST_INFIITE_PAGE_SIZE
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: flattenedPosts?.length + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 300, // Rough size of a postTeasercard
    scrollMargin: parentOffsetRef.current,
    overscan: 5, // Amount of items to load before and after (improved performance especially with images)
    initialOffset: window.scrollY, // Take scroll position from window so we can restore tab positioning
    scrollToFn: (
      offset: number,
      { adjustments = 0, behavior }: { adjustments?: number; behavior?: ScrollBehavior },
      instance: Virtualizer<Window, Element>
    ) => {
      // We block big adjustments to prevent the user from loosing their scroll position when expanding a post
      if (Math.abs(adjustments) >= window.screenY) return;
      const toOffset = offset + adjustments;

      instance.scrollElement?.scrollTo?.({
        [instance.options.horizontal ? 'left' : 'top']: toOffset,
        behavior,
      });
    },
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= flattenedPosts?.length - 1 && hasMorePosts && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasMorePosts,
    fetchNextPage,
    flattenedPosts?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  return (
    <>
      <div className={className}>
        {!isPostsLoaded ? (
          <div className="flex flex-col gap-4 px-4">
            <LoadingBlock className="h-10" />
            <LoadingBlock className="h-10" />
            <LoadingBlock className="h-10" />
          </div>
        ) : flattenedPosts?.length ? (
          <div ref={parentRef}>
            <div
              className="relative w-full"
              style={{
                height: virtualizer.getTotalSize(),
              }}
            >
              <div
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                {items.map((virtualRow) => {
                  const isLoaderRow = virtualRow.index > flattenedPosts.length - 1;
                  if (isLoaderRow) {
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        className="pt-5"
                      >
                        {hasMorePosts || isFetchingNextPage ? (
                          <div className="animate-pulse" key={'loading'}>
                            {t('Loading...')}
                          </div>
                        ) : (
                          <div className="italic opacity-50" key={'no-more'}>
                            {t('No more posts')}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const postFile = flattenedPosts[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="py-2 first:pt-0 last:pb-0"
                    >
                      <PostTeaser
                        key={postFile.fileId}
                        postFile={postFile}
                        hideImageWhenNone={true}
                        showChannel={true}
                        allowExpand={true}
                        login={() => setIsLogin(true)}
                        showAuthor={showAuthor}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <SubtleMessage>{t('Nothing has been posted yet')}</SubtleMessage>
        )}
      </div>
      <LoginDialog
        isOpen={isLogin}
        onCancel={() => setIsLogin(false)}
        title={t('Login required')}
        returnPath={window.location.pathname}
      />
    </>
  );
};

export default VerticalPosts;
