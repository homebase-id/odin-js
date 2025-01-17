import { useCommunity } from '../../hooks/community/useCommunity';
import { ErrorBoundary, LoadingBlock, t, COMMUNITY_ROOT_PATH } from '@homebase-id/common-app';
import { Link, useParams } from 'react-router-dom';
import { memo, useMemo, useRef } from 'react';
import { ChatBubble, ChevronLeft } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { ThreadMeta, useCommunityThreads } from '../../hooks/community/threads/useCommunityThreads';
import { CommunityThreadCatchup } from '../../components/Community/catchup/CommunityThreadCatchup';
import { useMarkCommunityAsRead } from '../../hooks/community/useMarkCommunityAsRead';
import { useVirtualizer } from '@tanstack/react-virtual';

export const CommunityThreadsCatchup = memo(() => {
  const { odinKey, communityKey: communityId } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;

  useMarkCommunityAsRead({ odinId: odinKey, communityId, threads: true });

  const { data: flatThreadMetas, isFetched: fetchedThreads } = useCommunityThreads({
    odinId: odinKey,
    communityId: communityId,
  });
  const uniqueFlatThreadMetas = useMemo(() => {
    if (!flatThreadMetas) return [];
    const uniqueThreads: Record<string, ThreadMeta> = {};

    for (let i = 0; i < flatThreadMetas?.length; i++) {
      if (uniqueThreads[flatThreadMetas[i].threadId]) {
        continue;
      } else {
        uniqueThreads[flatThreadMetas[i].threadId] = flatThreadMetas[i];
      }
    }

    return Object.values(uniqueThreads);
  }, [flatThreadMetas]);

  if (!isFetched || !fetchedThreads) {
    return (
      <div className="h-full w-20 flex-grow bg-page-background">
        <LoadingBlock className="h-16 w-full" />
        <div className="mt-8 flex flex-col gap-4 px-5">
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!community)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  return (
    <ErrorBoundary>
      <InnerThreadsCatchup community={community} threadMetas={uniqueFlatThreadMetas} />
    </ErrorBoundary>
  );
});

CommunityThreadsCatchup.displayName = 'CommunityThreadsCatchup';

const InnerThreadsCatchup = memo(
  (props: { community: HomebaseFile<CommunityDefinition>; threadMetas: ThreadMeta[] }) => {
    const { community, threadMetas } = props;

    const scrollRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      getScrollElement: () => scrollRef.current,
      count: threadMetas?.length || 0,
      estimateSize: () => 500,
      overscan: 4,
      getItemKey: (index) => threadMetas?.[index]?.threadId || index,
    });
    const items = virtualizer.getVirtualItems();

    return (
      <ErrorBoundary>
        <div className="h-full w-20 flex-grow bg-page-background">
          <div className="relative flex h-full flex-row">
            <div className="flex h-full flex-grow flex-col overflow-hidden">
              <div className="flex h-full flex-grow flex-col">
                <CommunityCatchupHeader community={community} />
                {!threadMetas?.length ? (
                  <p className="m-auto text-lg">{t('No threads found')}</p>
                ) : (
                  <div
                    className="relative h-20 flex-grow flex-col overflow-auto p-3"
                    ref={scrollRef}
                  >
                    <div
                      className="relative w-full overflow-hidden"
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
                        {items.map((item) => {
                          const threadMeta = threadMetas?.[item.index];
                          return (
                            <div
                              key={item.key}
                              data-index={item.index}
                              ref={virtualizer.measureElement}
                              className="pb-3 last-of-type:pb-0"
                            >
                              {threadMeta ? (
                                <CommunityThreadCatchup
                                  community={community}
                                  threadMeta={threadMeta}
                                  key={threadMeta.threadId}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }
);

InnerThreadsCatchup.displayName = 'InnerThreadsCatchup';

const CommunityCatchupHeader = ({
  community,
}: {
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const communityId = community?.fileMetadata.appData.uniqueId;

  return (
    <>
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <Link
          className="-m-1 p-1 lg:hidden"
          type="mute"
          to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>
        <ChatBubble className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Threads')}
      </div>
    </>
  );
};
