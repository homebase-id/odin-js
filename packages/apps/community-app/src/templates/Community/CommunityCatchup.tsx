import { useCommunity } from '../../hooks/community/useCommunity';
import {
  ErrorBoundary,
  LoadingBlock,
  t,
  COMMUNITY_ROOT_PATH,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Link, useParams } from 'react-router-dom';
import { CommunityChannelCatchup } from '../../components/Community/catchup/CommunityChannelCatchup';
import { useCommunityChannelsWithRecentMessages } from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { useCommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import { CommunityThread } from '../../components/Community/CommunityThread';
import { memo, useMemo } from 'react';
import { ChevronLeft, RadioTower } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';

export const CommunityCatchup = memo(() => {
  const { odinKey, communityKey: communityId, threadKey } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const { data: metadata } = useCommunityMetadata({
    odinId: odinKey,
    communityId: communityId,
  }).single;

  const { data: channels } = useCommunityChannelsWithRecentMessages({
    odinId: odinKey,
    communityId: communityId,
  }).fetch;

  const channelsToCatchup = useMemo(
    () =>
      metadata &&
      channels &&
      channels?.filter((chnl) => {
        if (!chnl.fileMetadata.appData.uniqueId) return false;
        const lastReadTime =
          metadata?.fileMetadata.appData.content.channelLastReadTime[
            chnl.fileMetadata.appData.uniqueId
          ];

        return (
          chnl.lastMessage?.fileMetadata.created &&
          chnl.lastMessage.fileMetadata.created > (lastReadTime || 0) &&
          !!chnl.lastMessage.fileMetadata.senderOdinId &&
          chnl.lastMessage.fileMetadata.senderOdinId !== loggedOnIdentity
        );
      }),
    [channels, metadata, loggedOnIdentity]
  );

  if (!community && isFetched)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  if (!community) {
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
              {!channelsToCatchup?.length ? (
                <p className="m-auto text-lg">{t('All done!')} 🎉</p>
              ) : (
                <div className="flex h-20 flex-grow flex-col gap-3 overflow-auto p-3">
                  {channelsToCatchup?.map((chnl) => (
                    <CommunityChannelCatchup
                      community={community}
                      channel={chnl}
                      key={chnl.fileId}
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

CommunityCatchup.displayName = 'CommunityCatchup';

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
        <RadioTower className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Activity')}
      </div>
    </>
  );
};
