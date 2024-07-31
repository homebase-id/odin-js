import { HomebaseFile } from '@youfoundation/js-lib/core';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { usecommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import {
  ChannelWithRecentMessage,
  useCommunityChannelsWithRecentMessages,
} from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { CommunityHistory } from './channel/CommunityHistory';
import { ActionButton, ActionLink, ChevronLeft, RadioTower, t } from '@youfoundation/common-app';
import { COMMUNITY_ROOT } from '../../templates/Community/CommunityHome';

export const CommunityCatchup = ({
  community,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
}) => {
  const { data: metadata } = usecommunityMetadata({
    communityId: community?.fileMetadata?.appData?.uniqueId,
  }).single;

  const { data: channels } = useCommunityChannelsWithRecentMessages({
    communityId: community?.fileMetadata?.appData?.uniqueId,
  }).fetch;

  const channelsToCatchup = channels?.filter((chnl) => {
    if (!chnl.fileMetadata.appData.uniqueId) return false;
    const lastReadTime =
      metadata?.fileMetadata.appData.content.channelLastReadTime[
        chnl.fileMetadata.appData.uniqueId
      ];

    return (
      chnl.lastMessage?.fileMetadata.created &&
      chnl.lastMessage.fileMetadata.created > (lastReadTime || 0) &&
      !!chnl.lastMessage.fileMetadata.senderOdinId
    );
  });

  if (!community) return null;
  if (!channelsToCatchup?.length) return <>{t('All done!')}</>;

  return (
    <div className="overflow-auto">
      <CommunityChannelCatchupHeader community={community} />
      <div className="">
        {channelsToCatchup?.map((chnl) => (
          <CommunityChannelCatchup community={community} channel={chnl} key={chnl.fileId} />
        ))}
      </div>
    </div>
  );
};

const CommunityChannelCatchupHeader = ({
  community,
}: {
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const communityId = community?.fileMetadata.appData.uniqueId;

  return (
    <>
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink className="lg:hidden" type="mute" href={`${COMMUNITY_ROOT}/${communityId}`}>
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>
        <RadioTower className="h-6 w-6" /> {t('Activity')}
      </div>
    </>
  );
};

const CommunityChannelCatchup = ({
  community,
  channel,
}: {
  community: HomebaseFile<CommunityDefinition>;
  channel: ChannelWithRecentMessage;
}) => {
  // const communityId = community.fileMetadata.appData.uniqueId;

  return (
    <div className="p-3">
      <div className="rounded-md border">
        <div className="flex flex-row bg-slate-200 px-2 py-2">
          <h2 className="text-lg"># {channel.fileMetadata.appData.content.title}</h2>
          <ActionButton className="ml-auto" size="small" type={'secondary'}>
            {t('Mark as read')}
          </ActionButton>
        </div>
        <div className="relative">
          <CommunityHistory community={community} channel={channel} alignTop={true} />
        </div>
        {/* <ErrorBoundary>
          <MessageComposer
            community={community || undefined}
            groupId={communityId}
            channel={channel || undefined}
            key={channel.fileMetadata.appData.uniqueId}
          />
        </ErrorBoundary> */}
      </div>
    </div>
  );
};
