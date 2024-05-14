import { Virtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { PostContent } from '@youfoundation/js-lib/public';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Label,
  SubtleMessage,
  useBlogPostsInfinite,
  useDotYouClient,
} from '@youfoundation/common-app';
import { Select } from '@youfoundation/common-app';
import { flattenInfinteData } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { useChannels } from '@youfoundation/common-app';
import ChannelTeaser from '../ChannelTeaser/ChannelTeaser';
import { LoadingBlock } from '@youfoundation/common-app';
import { useAuth } from '../../../../hooks/auth/useAuth';
import { PostTeaser } from '@youfoundation/common-app';
import LoginDialog from '../../../../components/Dialog/LoginDialog/LoginDialog';
import { HomebaseFile } from '@youfoundation/js-lib/core';

const PAGE_SIZE = 30;

const VerticalPosts = ({ className }: { className?: string }) => {
  const [mobileChannelId, setMobileChannelId] = useState<string>();

  return (
    <div className={className ?? ''}>
      <div className="grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-5 xl:grid-cols-6">
        <ChannelSidebar
          className="lg:order-2 lg:col-span-2"
          setChannelId={(newId) => setMobileChannelId(newId)}
        />
        <MainVerticalPosts className="lg:col-span-3" channelId={mobileChannelId} />
      </div>
    </div>
  );
};

const ChannelSidebar = ({
  className,
  channelId,
  setChannelId,
}: {
  className: string;
  channelId?: string;
  setChannelId: (channelId: string | undefined) => void;
}) => {
  const { isAuthenticated, isOwner } = useAuth();
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
          defaultValue={channelId || 'all'}
          onChange={(e) =>
            setChannelId(e.currentTarget.value === 'all' ? undefined : e.currentTarget.value)
          }
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
  const { isOwner, getIdentity } = useDotYouClient();
  const isAuthenticated = isOwner || !!getIdentity();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });
  const showAuthor = channels?.find(
    (channel) =>
      channel.fileMetadata.appData.content.isCollaborative &&
      channel.fileMetadata.appData.content.showOnHomePage
  );

  const [isLogin, setIsLogin] = useState(false);

  const {
    data: blogPosts,
    hasNextPage: hasMorePosts,
    fetchNextPage,
    isFetchingNextPage,
    isFetched: isPostsLoaded,
  } = useBlogPostsInfinite({ pageSize: PAGE_SIZE, channelId: channelId });
  const flattenedPosts = flattenInfinteData<HomebaseFile<PostContent>>(blogPosts, PAGE_SIZE);

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
          <div className="-mx-4">
            <LoadingBlock className="m-4 h-10" />
            <LoadingBlock className="m-4 h-10" />
            <LoadingBlock className="m-4 h-10" />
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
