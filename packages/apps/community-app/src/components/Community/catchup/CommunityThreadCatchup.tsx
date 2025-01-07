import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityHistory } from '../channel/CommunityHistory';
import {
  ActionLink,
  AuthorName,
  COMMUNITY_ROOT_PATH,
  ErrorBoundary,
  t,
} from '@homebase-id/common-app';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { ThreadMeta } from '../../../hooks/community/threads/useCommunityThreads';
import React, { useState } from 'react';
import { MessageComposer } from '../Message/composer/MessageComposer';

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

  if (!channel || !originMessage) return null;

  return (
    <div className="rounded-md border bg-background hover:shadow-md">
      <div className="flex flex-col bg-slate-200 px-2 py-2 dark:bg-slate-800">
        <p className="text-lg"># {channel.fileMetadata.appData.content.title}</p>
        <p className="text-sm text-slate-400">
          {threadMeta.participants.map((participant, index) => (
            <React.Fragment key={participant}>
              <AuthorName odinId={participant} excludeLink={true} />
              {threadMeta.participants.length > 1 ? (
                <>
                  {index < threadMeta.participants.length - 2
                    ? ', '
                    : index < threadMeta.participants.length - 1
                      ? ' and '
                      : ''}
                </>
              ) : null}
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* <div className="flex flex-row justify-center py-2">
        <ActionLink
          href={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}/${threadMeta.threadId}/thread`}
          type="secondary"
          size="none"
          className="px-2 py-1 text-sm"
        >
          {t('See older messages')}
        </ActionLink>
      </div> */}
      <CommunityHistory
        community={community}
        channel={channel}
        origin={originMessage}
        setParticipants={setParticipants}
        alignTop={true}
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
