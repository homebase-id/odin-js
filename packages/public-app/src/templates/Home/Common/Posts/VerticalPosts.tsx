import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { PostContent, PostFile } from '@youfoundation/js-lib';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Label from '../../../../components/Form/Label';
import Select from '../../../../components/Form/Select';
import PostTeaser from '../../../../components/Post/Common/Card/PostTeaser';
import LoadingParagraph from '../../../../components/ui/LoadingParagraph/LoadingParagraph';
import { flattenInfinteData } from '../../../../helpers/common';
import { t } from '../../../../helpers/i18n/dictionary';
import useBlogPosts from '../../../../hooks/blog/useBlogPosts';
import useBlogPostsInfinite from '../../../../hooks/blog/useBlogPostsInfinite';
import useChannels from '../../../../hooks/blog/useChannels';
import ChannelTeaser from '../ChannelTeaser/ChannelTeaser';

const PAGE_SIZE = 12;

const VerticalPosts = ({ className }: { className?: string }) => {
  const [mobileChannelId, setMobileChannelId] = useState<string>();

  return (
    <div className={className ?? ''}>
      <div className="grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-5 xl:grid-cols-6">
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
  const { data: channels } = useChannels();
  return (
    <div className={className}>
      <div className="hidden grid-flow-row gap-4 lg:grid">
        {channels?.map((channel) => {
          return <ChannelTeaser key={channel.channelId} channel={channel} className={'w-full'} />;
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
            <option value={channel.channelId} key={channel.channelId}>
              {channel.name}
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
  const [isStatic, setIsStatic] = useState(true);

  const { data: staticPosts, isFetchedAfterMount: staticPostsLoaded } = useBlogPosts({
    pageSize: PAGE_SIZE,
    channelId: channelId,
  });
  const {
    data: blogPosts,
    hasNextPage: hasMorePosts,
    fetchNextPage,
    isFetchingNextPage,
  } = useBlogPostsInfinite({ pageSize: PAGE_SIZE, enabled: !isStatic, channelId: channelId });
  const flattenedPosts = flattenInfinteData<PostFile<PostContent>>(blogPosts, PAGE_SIZE);
  const combinedPosts = combinePosts(staticPosts, flattenedPosts);

  const parentRef = useRef<HTMLDivElement>(null);
  const parentOffsetRef = useRef(0);

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: combinedPosts?.length + 1, // Add 1 so we have an index for the 'loaderRow'
    estimateSize: () => 300, // Rough size of a postTeasercard
    scrollMargin: parentOffsetRef.current,
    overscan: 5, // Amount of items to load before and after (improved performance especially with images)
    initialOffset: window.scrollY, // Take scroll position from window so we can restore tab positioning
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= combinedPosts?.length - 1 &&
      ((isStatic && staticPostsLoaded) || (hasMorePosts && !isFetchingNextPage))
    ) {
      if (isStatic) setIsStatic(false);
      else fetchNextPage();
    }
  }, [
    hasMorePosts,
    fetchNextPage,
    combinedPosts?.length,
    isFetchingNextPage,
    virtualizer.getVirtualItems(),
  ]);

  const items = virtualizer.getVirtualItems();

  return (
    <div className={className}>
      {!staticPostsLoaded && !combinePosts ? (
        <div className="-mx-4">
          <LoadingParagraph className="m-4 h-10" />
          <LoadingParagraph className="m-4 h-10" />
          <LoadingParagraph className="m-4 h-10" />
        </div>
      ) : combinedPosts?.length ? (
        <div ref={parentRef}>
          <div
            className="relative w-full"
            style={{
              height: virtualizer.getTotalSize(),
            }}
          >
            <div
              className="absolute left-0 top-0 grid w-full grid-flow-row gap-4"
              style={{
                transform: `translateY(${items[0].start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {items.map((virtualRow) => {
                const isLoaderRow = virtualRow.index > combinedPosts.length - 1;
                if (isLoaderRow) {
                  return hasMorePosts || isFetchingNextPage || isStatic ? (
                    <div className="mt-5 animate-pulse" key={'loading'}>
                      {t('Loading...')}
                    </div>
                  ) : (
                    <div className="mt-5 italic opacity-50" key={'no-more'}>
                      {t('No more posts')}
                    </div>
                  );
                }

                const postFile = combinedPosts[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                  >
                    <PostTeaser
                      key={postFile.fileId}
                      postFile={postFile}
                      hideImageWhenNone={true}
                      showChannel={true}
                      allowExpand={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-slate-400">{t('Nothing has been posted yet')}</p>
        </>
      )}
    </div>
  );
};

const combinePosts = (
  staticPosts?: PostFile<PostContent>[],
  flattenedPosts?: PostFile<PostContent>[]
) => {
  const combinedPosts = [
    ...(staticPosts ? staticPosts : []),
    ...(flattenedPosts ? flattenedPosts : []),
  ].reduce((uniquePosts, post) => {
    if (uniquePosts.some((unique) => unique.content.id === post.content.id)) {
      return uniquePosts;
    } else {
      return [...uniquePosts, post];
    }
  }, [] as PostFile<PostContent>[]);

  combinedPosts.sort((a, b) => b.content.dateUnixTime - a.content.dateUnixTime);

  return combinedPosts;
};

export default VerticalPosts;
