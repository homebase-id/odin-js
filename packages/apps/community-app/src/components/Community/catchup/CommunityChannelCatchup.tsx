import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { ChannelWithRecentMessage } from '../../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { CommunityHistory } from '../channel/CommunityHistory';
import { ActionLink, COMMUNITY_ROOT_PATH, t } from '@homebase-id/common-app';
import { ExternalLink } from '@homebase-id/common-app/icons';

export const CommunityChannelCatchup = ({
  community,
  channel,
}: {
  community: HomebaseFile<CommunityDefinition>;
  channel: ChannelWithRecentMessage;
}) => {
  const communityId = community.fileMetadata.appData.uniqueId;
  const channelLink = `${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}`;

  return (
    <div className="rounded-md border">
      <div className="flex flex-row justify-between bg-slate-200 px-2 py-2 dark:bg-slate-800">
        <ActionLink type="mute" size="none" className="text-lg hover:underline" href={channelLink}>
          # {channel.fileMetadata.appData.content.title}
        </ActionLink>

        <ActionLink href={channelLink} type="secondary" size="none" className="px-2 py-1 text-sm">
          {t('Open channel')}
          <ExternalLink className="ml-2 h-3 w-3" />
        </ActionLink>
      </div>
      <div className="relative">
        <CommunityHistory
          community={community}
          channel={channel}
          alignTop={true}
          maxShowOptions={{
            count: 10,
            targetLink: channelLink,
          }}
        />
      </div>
    </div>
  );
};
