import {
  ActionLink,
  t,
  LoadingBlock,
  ErrorBoundary,
  COMMUNITY_ROOT_PATH,
} from '@homebase-id/common-app';
import { ChevronLeft, Times } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useParams } from 'react-router-dom';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { CommunityHistory } from './channel/CommunityHistory';
import { MessageComposer } from './Message/MessageComposer';

export const CommunityThread = ({
  community,
  channel,
  threadId,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel?: HomebaseFile<CommunityChannel> | undefined;
  threadId: string;
}) => {
  const { odinKey, communityKey, channelKey } = useParams();

  const { data: originMessage } = useCommunityMessage({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
    channelId: channel?.fileMetadata.appData.uniqueId,
    messageId: threadId,
    fileSystemType: 'Standard',
  }).get;

  if (!community || !threadId) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col shadow-lg xl:static xl:max-w-sm">
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink
          className="p-2 xl:hidden"
          size="none"
          type="mute"
          href={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || 'all'}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>
        {t('Thread')}
        <ActionLink
          href={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || 'all'}`}
          icon={Times}
          size="none"
          type="mute"
          className="hidden p-2 lg:-m-2 lg:ml-auto xl:flex"
        />
      </div>
      <div className="flex h-20 flex-grow flex-col overflow-auto bg-background">
        {!originMessage ? (
          <div className="flex flex-col gap-3 p-5">
            <LoadingBlock className="h-12 w-full" />
            <LoadingBlock className="h-12 w-full" />
            <LoadingBlock className="h-12 w-full" />
          </div>
        ) : (
          <CommunityHistory
            community={community}
            origin={originMessage}
            channel={channel}
            alignTop={true}
          />
        )}

        <ErrorBoundary>
          <MessageComposer
            community={community}
            thread={originMessage || undefined}
            channel={channel}
            key={threadId}
            className="mt-auto lg:mt-0"
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};
