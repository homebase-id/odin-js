import { PostContent } from '@youfoundation/js-lib/public';
import { useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { flattenInfinteData } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { LoadingBlock } from '@youfoundation/common-app';
import PostComposer from '../PostComposer';
import PostTeaserCard from '../PostTeaserCard';
import useSocialFeed from '@youfoundation/common-app/src/hooks/socialFeed/useSocialFeed';
import { PostFileVm } from '@youfoundation/js-lib/transit';

const PAGE_SIZE = 10; // We could increase this one, but also might not, as on mobile 10 items are rather far, and on desktop fetching more is fast...

// Docs for combination of Virtual and infinite:
// https://tanstack.com/virtual/v3/docs/examples/react/infinite-scroll
const SocialFeedMainContent = () => {
  const {
    data: posts,
    hasNextPage: hasMorePosts,
    isLoading: postsLoading,
    fetchNextPage,
    isFetchingNextPage,
  } = useSocialFeed({ pageSize: PAGE_SIZE }).fetchAll;

  // Flatten all pages, sorted descending and slice on the max number expected
  const flattenedPosts = useMemo(
    () =>
      flattenInfinteData<PostFileVm<PostContent>>(
        posts,
        PAGE_SIZE,
        (a, b) => b.content?.dateUnixTime - a.content?.dateUnixTime
      ),
    [posts]
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
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

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
      <PostComposer className="mb-3 w-full rounded-md border-gray-200 border-opacity-60 bg-background p-4 shadow-sm dark:border-gray-800 lg:border" />
      {postsLoading ? (
        <div className="-mx-4">
          <LoadingBlock className="m-4 h-10" />
          <LoadingBlock className="m-4 h-10" />
          <LoadingBlock className="m-4 h-10" />
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
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${items[0].start - virtualizer.options.scrollMargin}px)`,
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

                  const post = flattenedPosts[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="py-3"
                    >
                      <PostTeaserCard
                        key={post.fileId || post.content.id}
                        postFile={post}
                        odinId={post.odinId}
                        className={`${
                          !post.fileId
                            ? 'overflow-hidden bg-slate-100 dark:bg-slate-600'
                            : 'bg-background shadow-sm'
                        }`}
                        showSummary={true}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};

export default SocialFeedMainContent;
