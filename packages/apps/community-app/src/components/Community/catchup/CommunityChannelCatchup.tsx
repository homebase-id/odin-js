import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { ChannelWithRecentMessage } from '../../../hooks/community/channels/useCommunityChannelsWithRecentMessages';
import { CommunityHistory } from '../channel/CommunityHistory';
import { ActionLink, COMMUNITY_ROOT_PATH, useOdinClientContext } from '@homebase-id/common-app';
import { ExternalLink } from '@homebase-id/common-app/icons';
import { useCommunityMetadata } from '../../../hooks/community/useCommunityMetadata';
import { useMemo } from 'react';

export const CommunityChannelCatchup = ({
  community,
  channel,
}: {
  community: HomebaseFile<CommunityDefinition>;
  channel: ChannelWithRecentMessage;
}) => {
  const communityId = community.fileMetadata.appData.uniqueId;
  const channelLink = useMemo(
    () =>
      `${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}`,
    [community, communityId, channel]
  );
  const { data: metadata } = useCommunityMetadata({
    odinId: community.fileMetadata.senderOdinId,
    communityId,
  }).single;

  const channelLastRead = useMemo(
    () =>
      metadata?.fileMetadata.appData.content.channelLastReadTime[
        channel.fileMetadata.appData.uniqueId as string
      ],
    [metadata, channel]
  );

  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();

  const defaultMaxAge = useMemo(() => {
    if (!channel.lastMessage) return 0;

    const todayDate = new Date(channel.lastMessage?.fileMetadata.created);
    todayDate.setHours(0, 0, 0, 0);
    return todayDate.getTime();
  }, [channel]);

  const maxAge = useMemo(
    () =>
      (channel.lastMessage?.fileMetadata.originalAuthor !== loggedInIdentity &&
        channelLastRead &&
        channelLastRead < defaultMaxAge &&
        channelLastRead) ||
      defaultMaxAge,
    [channel, channelLastRead, defaultMaxAge, loggedInIdentity]
  );

  const showOptions = useMemo(() => {
    return {
      count: 5,
      targetLink: channelLink,
    };
  }, [channelLink]);

  if (!channel.lastMessage) return null;

  return (
    <div className="pb-3 last-of-type:pb-0">
      <div className="overflow-hidden rounded-md border bg-background">
        <ActionLink
          type="mute"
          size="none"
          className="group flex flex-row items-center justify-between rounded-b-none bg-slate-200 px-3 py-2 text-lg dark:bg-slate-800"
          href={channelLink}
        >
          <span className="group-hover:underline">
            # {channel.fileMetadata.appData.content.title}
          </span>
          <ExternalLink className="ml-auto mr-2 h-3 w-3" />
        </ActionLink>

        <div className="relative">
          <CommunityHistory
            community={community}
            channel={channel}
            alignTop={true}
            maxShowOptions={showOptions}
            maxAge={maxAge}
          />
        </div>
      </div>
    </div>
  );
};
