import {
  NotFound,
  ErrorBoundary,
  t,
  COMMUNITY_ROOT_PATH,
  LoadingBlock,
} from '@homebase-id/common-app';
import { ChevronLeft, Pin } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useParams, Link } from 'react-router-dom';
import { useCommunity } from '../../hooks/community/useCommunity';
import { useCommunityPins } from '../../hooks/community/useCommunityPin';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { CommunityMessageItem } from '../../components/Community/Message/item/CommunityMessageItem';

export const CommunityPins = () => {
  const { odinKey, communityKey } = useParams();

  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const { data: pinnedMessages, isFetching } = useCommunityPins({
    odinId: odinKey,
    communityId: communityKey,
  }).all;

  if (!community) return <NotFound />;

  if (isFetching)
    return (
      <div className="p-5">
        <LoadingBlock className="h-16 w-full" />
      </div>
    );

  return (
    <ErrorBoundary>
      <div className="h-full w-20 flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <div className="flex h-full flex-grow flex-col">
              <CommuintyPinsHeader community={community} />
              {!pinnedMessages?.searchResults?.length ? (
                <p className="m-auto text-lg">{t('All done!')} 🎉</p>
              ) : (
                <div className="flex h-20 flex-grow flex-col gap-5 overflow-auto p-5">
                  {pinnedMessages?.searchResults?.length ? (
                    <>
                      {pinnedMessages?.searchResults.map((pinned, index) => {
                        return (
                          <Link
                            to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${pinned.fileMetadata.appData.content.channelId}/${pinned.fileMetadata.appData.uniqueId}`}
                            key={pinned.fileId || index}
                          >
                            <CommunityMessageItem
                              msg={pinned}
                              community={community}
                              className="pointer-events-none cursor-pointer rounded-lg border px-2 py-1 hover:shadow-md md:px-3"
                              showChannelName={true}
                            />
                          </Link>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-slate-400">{t('No pinned messages')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

const CommuintyPinsHeader = ({ community }: { community?: HomebaseFile<CommunityDefinition> }) => {
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
        <Pin className="h-4 w-4 sm:h-5 sm:w-5" /> {t('Pins')}
      </div>
    </>
  );
};
