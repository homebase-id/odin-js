import { useCommunity } from '../../hooks/community/useCommunity';
import { ErrorBoundary, LoadingBlock, t, COMMUNITY_ROOT_PATH } from '@homebase-id/common-app';
import { Link, useParams } from 'react-router-dom';
import { CommunityChannelCatchup } from '../../components/Community/catchup/CommunityChannelCatchup';
import { useCommunityChannelsWithRecentMessages } from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { memo } from 'react';
import { ChevronLeft, RadioTower } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';

export const CommunityChannelsCatchup = memo(() => {
  const { odinKey, communityKey: communityId } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;

  const { data: channels } = useCommunityChannelsWithRecentMessages({
    odinId: odinKey,
    communityId: communityId,
  }).fetch;

  if (!community) {
    if (isFetched)
      return (
        <div className="flex h-full flex-grow flex-col items-center justify-center">
          <p className="text-4xl">Homebase Community</p>
        </div>
      );
    else
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

  return (
    <ErrorBoundary>
      <div className="h-full w-20 flex-grow bg-page-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <div className="flex h-full flex-grow flex-col">
              <CommunityCatchupHeader community={community} />
              {!channels?.length ? (
                <p className="m-auto text-lg">{t('All done!')} 🎉</p>
              ) : (
                <div className="h-20 flex-grow overflow-auto p-3">
                  {channels?.map((chnl) => (
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
        </div>
      </div>
    </ErrorBoundary>
  );
});

CommunityChannelsCatchup.displayName = 'CommunityChannelsCatchup';

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
