import { useCommunity } from '../../hooks/community/useCommunity';
import { ErrorBoundary, LoadingBlock, t, COMMUNITY_ROOT_PATH } from '@homebase-id/common-app';
import { Link, useParams } from 'react-router-dom';
import { CommunityThread } from '../../components/Community/CommunityThread';
import { memo, useMemo } from 'react';
import { ChatBubble, ChevronLeft } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { useCommunityThreads } from '../../hooks/community/threads/useCommunityThreads';
import { CommunityThreadCatchup } from '../../components/Community/catchup/CommunityThreadCatchup';

export const CommunityThreadsCatchup = memo(() => {
  const { odinKey, communityKey: communityId, threadKey } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;

  const { data: threadMetas, isFetching } = useCommunityThreads({
    odinId: odinKey,
    communityId: communityId,
    onlyWithMe: true,
  }).all;

  const flatThreadMetas = useMemo(
    () => threadMetas?.pages.flatMap((page) => page.searchResults),
    [threadMetas]
  );

  if (!community && isFetched)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  if (!community || isFetching) {
    return (
      <div className="h-full w-full flex-grow bg-background">
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

  return (
    <ErrorBoundary>
      <div className="h-full w-full flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <div className="flex h-full flex-grow flex-col">
              <CommunityCatchupHeader community={community} />
              {!flatThreadMetas?.length ? (
                <p className="m-auto text-lg">{t('No threads found')}</p>
              ) : (
                <div className="flex h-20 flex-grow flex-col gap-3 overflow-auto p-3">
                  {flatThreadMetas?.map((threadMeta) => (
                    <CommunityThreadCatchup
                      community={community}
                      threadMeta={threadMeta}
                      key={threadMeta.threadId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {threadKey ? (
            <ErrorBoundary>
              <CommunityThread community={community} channel={undefined} threadId={threadKey} />
            </ErrorBoundary>
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  );
});

CommunityThreadsCatchup.displayName = 'CommunityThreadsCatchup';

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
