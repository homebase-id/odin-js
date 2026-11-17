import {PostContent} from '@homebase-id/js-lib/public';
import {useMemo, useEffect, useRef, useLayoutEffect, useState} from 'react';
import {useWindowVirtualizer, type VirtualItem} from '@tanstack/react-virtual';
import {useLocation} from 'react-router-dom';

import {
  flattenInfinteData,
  t,
  LoadingBlock,
  PostComposer,
  useSocialFeed,
  SubtleMessage,
} from '@homebase-id/common-app';
import PostTeaserCard, {NewPostTeaserCard} from '../PostTeaserCard';
import {HomebaseFile} from '@homebase-id/js-lib/core';
import {useLiveFeedProcessor} from '../../../hooks/useLiveFeedProcessor';

type SavedScroll = {y: number; measurements: VirtualItem[]};
const readScroll = (key: string): SavedScroll | undefined => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    return typeof saved?.y === 'number' && Array.isArray(saved.measurements) ? saved : undefined;
  } catch {
    return undefined;
  }
};

const PAGE_SIZE = 15; // We could increase this one, but also might not, as on mobile 10 items are rather far, and on desktop fetching more is fast...

// Docs for combination of Virtual and infinite:
// https://tanstack.com/virtual/v3/docs/examples/react/infinite-scroll
const SocialFeedMainContent = () => {
  useLiveFeedProcessor();

  const {
    data: posts,
    hasNextPage: hasMorePosts,
    isLoading: postsLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useSocialFeed({pageSize: PAGE_SIZE}).fetchAll;

  // Flatten all pages, sorted descending and slice on the max number expected
  const flattenedPosts = useMemo(
    () =>
      flattenInfinteData<HomebaseFile<PostContent>>(
        posts,
        hasMorePosts ? PAGE_SIZE : undefined, // If we're out of ServerSide pages we don't want to slice
        (a, b) =>
          (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
          (a.fileMetadata.appData.userDate || a.fileMetadata.created)
      ),
    [posts]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  // Where the feed was left (opening an article leaves it), to come back to the same place
  const scrollKey = `feed-scroll:${useLocation().pathname}`;
  const [saved] = useState(() => readScroll(scrollKey));

  const virtualizer = useWindowVirtualizer({
    count: flattenedPosts?.length + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 300, // Rough size of a postTeasercard
    scrollMargin: parentOffsetRef.current,
    overscan: 5, // Amount of items to load before and after (improved performance especially with images)
    // The posts' sizes as they were measured, so the place comes back on the same post
    initialOffset: saved?.y,
    initialMeasurementsCache: saved?.measurements,
  });

  // Saved as the feed goes, before the next page's layout effects scroll the window (the reader starts at its top)
  useLayoutEffect(
    () => () => {
      try {
        sessionStorage.setItem(
          scrollKey,
          JSON.stringify({y: window.scrollY, measurements: virtualizer.measurementsCache})
        );
      } catch {
        // No storage (private mode, full): the feed starts at its top
      }
    },
    [scrollKey, virtualizer]
  );

  // Back where it was once the posts are on the page, once
  const restored = useRef(!saved);
  const hasPosts = !!flattenedPosts?.length;
  useLayoutEffect(() => {
    if (restored.current || !hasPosts || !saved) return;
    restored.current = true;
    window.scrollTo(0, saved.y);
  }, [hasPosts, saved]);

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (lastItem.index >= flattenedPosts?.length - 1 && hasMorePosts && !isFetchingNextPage)
      fetchNextPage();
  }, [
    hasMorePosts,
    fetchNextPage,
    flattenedPosts?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  const isReactNative = window.localStorage.getItem('client_type') === 'react-native-v2';

  return (
    <>
      {isReactNative ? null : (
        <PostComposer className="mb-2 w-full rounded-md bg-background p-4 shadow-sm lg:border"/>
      )}
      {postsLoading ? (
        <div className="flex flex-col gap-4">
          <LoadingBlock className="my-4 h-10"/>
          <LoadingBlock className="my-4 h-10"/>
          <LoadingBlock className="my-4 h-10"/>
        </div>
      ) : flattenedPosts?.length ? (
        <>
          <div ref={parentRef}>
            <div
              className="relative w-full"
              style={{
                height: virtualizer.getTotalSize(),
              }}
            >
              <div
                className="absolute left-0 top-0 z-10 w-full"
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
                            {t(`No more posts. Expecting more? Make sure you're following them.`)}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const post = flattenedPosts[virtualRow.index];
                  
                  const postTeaserCardProps = {
                    postFile: post,
                    className: 'bg-background shadow-sm',
                    showSummary: true,
                  };
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="py-2"
                    >
                      {post.fileId ? (
                        <PostTeaserCard
                          key={post.fileId || post.fileMetadata.appData.content.id}
                          {...postTeaserCardProps}
                        />
                      ) : (
                        <NewPostTeaserCard
                          key={post.fileId || post.fileMetadata.appData.content.id}
                          {...postTeaserCardProps}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <SubtleMessage>
          {t('No posts yet, send a post to your followers, or start following other identities')}
        </SubtleMessage>
      )}
    </>
  );
};

export default SocialFeedMainContent;
