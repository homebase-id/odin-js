import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityHistory } from '../channel/CommunityHistory';
import {
  ActionLink,
  COMMUNITY_ROOT_PATH,
  ErrorBoundary,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { ThreadMeta } from '../../../hooks/community/threads/useCommunityThreads';
import { useMemo, useState } from 'react';
import { MessageComposer } from '../Message/composer/MessageComposer';
import { ExternalLink } from '@homebase-id/common-app/icons';
import { ParticipantsList } from '../participants/ParticipantsList';
import { useCommunityMetadata } from '../../../hooks/community/useCommunityMetadata';

export const CommunityThreadCatchup = ({
  community,
  threadMeta,
}: {
  community: HomebaseFile<CommunityDefinition>;
  threadMeta: ThreadMeta;
}) => {
  const communityId = community.fileMetadata.appData.uniqueId;
  const [participants, setParticipants] = useState<string[] | null>();

  const { data: metadata } = useCommunityMetadata({
    odinId: community.fileMetadata.senderOdinId,
    communityId,
  }).single;

  const threadsLastRead = useMemo(
    () => metadata?.fileMetadata.appData.content.threadsLastReadTime,
    [metadata]
  );

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
      count: 5,
      targetLink: channel
        ? `${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}/${threadMeta.threadId}/thread?ui=full`
        : '',
    };
  }, [community, channel]);

  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();

  const defaultMaxAge = useMemo(() => {
    const todayDate = new Date(threadMeta.lastMessageCreated);
    todayDate.setHours(0, 0, 0, 0);
    return todayDate.getTime();
  }, [threadMeta]);

  const maxAge = useMemo(
    () =>
      (threadMeta.lastAuthor !== loggedInIdentity &&
        threadsLastRead &&
        threadsLastRead < defaultMaxAge &&
        threadsLastRead) ||
      defaultMaxAge,
    [threadMeta, threadsLastRead, defaultMaxAge, loggedInIdentity]
  );

  if (!channel || !originMessage) return null;

  return (
    <div className="overflow-hidden rounded-md border bg-background hover:shadow-md">
      <ActionLink
        href={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}/${threadMeta.threadId}/thread`}
        type="mute"
        size="none"
        className="group flex flex-row items-center justify-between rounded-b-none bg-slate-200 px-3 py-2 text-lg dark:bg-slate-800"
      >
        <div className="flex flex-col">
          <p className="text-lg group-hover:underline">
            # {channel.fileMetadata.appData.content.title}
          </p>
          <p className="text-sm text-slate-400">
            <ParticipantsList participants={threadMeta.participants} />
          </p>
        </div>
        <ExternalLink className="ml-auto mr-2 h-3 w-3" />
      </ActionLink>

      <CommunityHistory
        community={community}
        channel={channel}
        origin={originMessage}
        setParticipants={setParticipants}
        alignTop={true}
        maxShowOptions={showOptions}
        maxAge={maxAge}
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
            autoFocus={false}
          />
        ) : null}
      </ErrorBoundary>
    </div>
  );
};
