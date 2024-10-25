import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { useCommunityMetadata } from '../../../hooks/community/useCommunityMetadata';
import { ChannelWithRecentMessage } from '../../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { CommunityHistory } from '../channel/CommunityHistory';
import { ActionButton, ActionLink, t } from '@homebase-id/common-app';
import { RadioTower } from '@homebase-id/common-app/icons';
import { ROOT_PATH as COMMUNITY_ROOT } from '../../../app/App';
import { useCallback } from 'react';
import { ChevronLeft } from '@homebase-id/common-app/icons';

export const CommunityChannelCatchupHeader = ({
  community,
}: {
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const communityId = community?.fileMetadata.appData.uniqueId;

  return (
    <>
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink
          className="lg:hidden"
          type="mute"
          href={`${COMMUNITY_ROOT}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>
        <RadioTower className="h-6 w-6" /> {t('Activity')}
      </div>
    </>
  );
};

export const CommunityChannelCatchup = ({
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
  } = useCommunityMetadata({ odinId: community.fileMetadata.senderOdinId, communityId });

  const doMarkAsRead = useCallback(() => {
    if (
      !metadata ||
      !channel.fileMetadata.appData.uniqueId ||
      !channel.lastMessage?.fileMetadata.created ||
      updateStatus === 'pending'
    )
      return;

    const newMetadata = {
      ...metadata,
      fileMetadata: {
        ...metadata.fileMetadata,
        appData: {
          ...metadata.fileMetadata.appData,
          content: {
            ...metadata.fileMetadata.appData.content,
            channelLastReadTime: {
              ...metadata.fileMetadata.appData.content.channelLastReadTime,
              [channel.fileMetadata.appData.uniqueId]: channel.lastMessage.fileMetadata.created,
            },
          },
        },
      },
    };

    updateMeta({ metadata: newMetadata });
  }, []);

  return (
    <div className="rounded-md border">
      <div className="flex flex-row justify-between bg-slate-200 px-2 py-2 dark:bg-slate-800">
        <ActionLink
          type="mute"
          size="none"
          className="text-lg hover:underline"
          href={`${COMMUNITY_ROOT}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}`}
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
