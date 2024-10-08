import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { usecommunityMetadata } from '../../hooks/community/useCommunityMetadata';
import {
  ChannelWithRecentMessage,
  useCommunityChannelsWithRecentMessages,
} from '../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { CommunityHistory } from './channel/CommunityHistory';
import { ActionButton, ActionLink, t, useDotYouClient } from '@homebase-id/common-app';
import { RadioTower } from '@homebase-id/common-app/icons';
import { ROOT_PATH as COMMUNITY_ROOT } from '../../app/App';
import { useCallback } from 'react';
import { ChevronLeft } from '@homebase-id/common-app/icons';

export const CommunityCatchup = ({
  community,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
}) => {
  const identity = useDotYouClient().getIdentity();
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
      !!chnl.lastMessage.fileMetadata.senderOdinId &&
      chnl.lastMessage.fileMetadata.senderOdinId !== identity
    );
  });

  if (!community) return null;

  return (
    <div className="flex h-full flex-grow flex-col">
      <CommunityChannelCatchupHeader community={community} />
      {!channelsToCatchup?.length ? (
        <p className="m-auto text-lg">{t('All done!')} 🎉</p>
      ) : (
        <div className="flex h-20 flex-grow flex-col gap-3 overflow-auto p-3">
          {channelsToCatchup?.map((chnl) => (
            <CommunityChannelCatchup community={community} channel={chnl} key={chnl.fileId} />
          ))}
        </div>
      )}
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
  const communityId = community.fileMetadata.appData.uniqueId;
  const {
    single: { data: metadata },
    update: { mutate: updateMeta, status: updateStatus },
  } = usecommunityMetadata({ communityId });

  const doMarkAsRead = useCallback(() => {
    if (
      !metadata ||
      !channel.fileMetadata.appData.uniqueId ||
      !channel.lastMessage?.fileMetadata.created ||
      updateStatus !== 'idle'
    )
      return;
    const newMetadata = { ...metadata };
    metadata.fileMetadata.appData.content.channelLastReadTime[
      channel.fileMetadata.appData.uniqueId
    ] = channel.lastMessage.fileMetadata.created;
    updateMeta({ metadata: newMetadata });
  }, []);

  return (
    <div className="rounded-md border">
      <div className="flex flex-row justify-between bg-slate-200 px-2 py-2">
        <ActionLink
          type="mute"
          size="none"
          className="text-lg hover:underline"
          href={`${COMMUNITY_ROOT}/${communityId}/${channel.fileMetadata.appData.uniqueId}`}
        >
          # {channel.fileMetadata.appData.content.title}
        </ActionLink>
        {metadata ? (
          <ActionButton
            size="small"
            type={'secondary'}
            className="w-auto"
            state={updateStatus}
            onClick={doMarkAsRead}
          >
            {t('Mark as read')}
          </ActionButton>
        ) : null}
      </div>
      <div className="relative">
        <CommunityHistory community={community} channel={channel} alignTop={true} onlyNew={true} />
      </div>
    </div>
  );
};
