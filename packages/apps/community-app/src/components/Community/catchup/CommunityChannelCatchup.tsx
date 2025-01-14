import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { ChannelWithRecentMessage } from '../../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { CommunityHistory } from '../channel/CommunityHistory';
import { ActionLink, COMMUNITY_ROOT_PATH, useDotYouClientContext } from '@homebase-id/common-app';
import { ExternalLink } from '@homebase-id/common-app/icons';
import { useCommunityMetadata } from '../../../hooks/community/useCommunityMetadata';

export const CommunityChannelCatchup = ({
  community,
  channel,
}: {
  community: HomebaseFile<CommunityDefinition>;
  channel: ChannelWithRecentMessage;
}) => {
  const communityId = community.fileMetadata.appData.uniqueId;
  const channelLink = `${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}`;
  const { data: metadata } = useCommunityMetadata({
    odinId: community.fileMetadata.senderOdinId,
    communityId,
  }).single;
  const channelLastRead =
    metadata?.fileMetadata.appData.content.channelLastReadTime[
      channel.fileMetadata.appData.uniqueId as string
    ];

  const loggedInIdentity = useDotYouClientContext().getLoggedInIdentity();
  if (!channel.lastMessage) return null;

  const todayDate = new Date(channel.lastMessage?.fileMetadata.created);
  todayDate.setHours(0, 0, 0, 0);
  const defaultMaxAge = todayDate.getTime();

  const maxAge =
    (channel.lastMessage?.fileMetadata.originalAuthor !== loggedInIdentity &&
      channelLastRead &&
      channelLastRead < defaultMaxAge &&
      channelLastRead) ||
    defaultMaxAge;

  return (
    <div className="pb-3 last-of-type:pb-0">
      <div className="overflow-hidden rounded-md border bg-background">
        <ActionLink
          type="mute"
          size="none"
          className="flex flex-col justify-between rounded-b-none bg-slate-200 px-2 py-2 text-lg hover:underline dark:bg-slate-800 md:flex-row"
          href={channelLink}
        >
          # {channel.fileMetadata.appData.content.title}
          <ExternalLink className="ml-auto h-3 w-3" />
        </ActionLink>

        <div className="relative">
          <CommunityHistory
            community={community}
            channel={channel}
            alignTop={true}
            maxShowOptions={{
              count: 5,
              targetLink: channelLink,
            }}
            maxAge={maxAge}
          />
        </div>
      </div>
    </div>
  );
};
