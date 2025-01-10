import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityHistory } from '../channel/CommunityHistory';
import { ActionLink, COMMUNITY_ROOT_PATH, ErrorBoundary, t } from '@homebase-id/common-app';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { ThreadMeta } from '../../../hooks/community/threads/useCommunityThreads';
import { useMemo, useState } from 'react';
import { MessageComposer } from '../Message/composer/MessageComposer';
import { ExternalLink } from '@homebase-id/common-app/icons';
import { ParticipantsList } from '../participants/ParticipantsList';

export const CommunityThreadCatchup = ({
  community,
  threadMeta,
}: {
  community: HomebaseFile<CommunityDefinition>;
  threadMeta: ThreadMeta;
}) => {
  const communityId = community.fileMetadata.appData.uniqueId;
  const [participants, setParticipants] = useState<string[] | null>();

  const { data: channel } = useCommunityChannel({
    odinId: community.fileMetadata.senderOdinId,
    communityId,
    channelId: threadMeta.channelId,
  }).fetch;

  const { data: originMessage } = useCommunityMessage({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
    channelId: channel?.fileMetadata.appData.uniqueId,
    messageId: threadMeta.threadId,
    fileSystemType: 'Standard',
  }).get;

  const showOptions = useMemo(() => {
    return {
      count: 10,
      targetLink: channel
        ? `${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}/${threadMeta.threadId}/thread`
        : '',
    };
  }, [community, channel]);

  if (!channel || !originMessage) return null;

  return (
    <div className="overflow-hidden rounded-md border bg-background hover:shadow-md">
      <div className="flex flex-row items-center bg-slate-200 px-2 py-2 dark:bg-slate-800">
        <div className="flex flex-col">
          <p className="text-lg"># {channel.fileMetadata.appData.content.title}</p>
          <p className="text-sm text-slate-400">
            <ParticipantsList participants={threadMeta.participants} />
          </p>
        </div>
        <div className="ml-auto">
          <ActionLink
            href={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}/${threadMeta.threadId}/thread`}
            type="secondary"
            size="none"
            className="px-2 py-1 text-sm"
          >
            {t('See full thread')}
            <ExternalLink className="ml-2 h-3 w-3" />
          </ActionLink>
        </div>
      </div>

      <CommunityHistory
        community={community}
        channel={channel}
        origin={originMessage}
        setParticipants={setParticipants}
        alignTop={true}
        maxShowOptions={showOptions}
      />
      <ErrorBoundary>
        {originMessage ? (
          <MessageComposer
            community={community}
            thread={originMessage}
            channel={channel}
            key={threadMeta.threadId}
            threadParticipants={participants || undefined}
            className="mt-auto xl:mt-0"
          />
        ) : null}
      </ErrorBoundary>
    </div>
  );
};
