import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityHistory } from '../channel/CommunityHistory';
import { AuthorName, COMMUNITY_ROOT_PATH, FakeAnchor } from '@homebase-id/common-app';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { ThreadMeta } from '../../../hooks/community/threads/useCommunityThreads';
import React from 'react';

export const CommunityThreadCatchup = ({
  community,
  threadMeta,
}: {
  community: HomebaseFile<CommunityDefinition>;
  threadMeta: ThreadMeta;
}) => {
  const communityId = community.fileMetadata.appData.uniqueId;

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
    <div className="rounded-md border hover:shadow-md">
      <FakeAnchor
        href={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${communityId}/${channel.fileMetadata.appData.uniqueId}/${threadMeta.threadId}/thread`}
      >
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

        <div className="pointer-events-none relative">
          <CommunityHistory
            community={community}
            channel={channel}
            origin={originMessage}
            alignTop={true}
          />
        </div>
      </FakeAnchor>
    </div>
  );
};
