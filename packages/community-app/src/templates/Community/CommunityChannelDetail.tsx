import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import {
  ActionLink,
  AuthorImage,
  AuthorName,
  DialogWrapper,
  ErrorBoundary,
  formatDateExludingYearIfCurrent,
  LoadingBlock,
  t,
  useDotYouClient,
  usePortal,
} from '@homebase-id/common-app';
import { Arrow, ChevronLeft, Times } from '@homebase-id/common-app/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ROOT_PATH as COMMUNITY_ROOT } from '../../app/App';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { createPortal } from 'react-dom';
import { MessageComposer } from '../../components/Community/Message/MessageComposer';
import { CommunityHistory } from '../../components/Community/channel/CommunityHistory';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';
import { useMarkCommunityAsRead } from '../../hooks/community/useMarkCommunityAsRead';
import { CommunityCatchup } from '../../components/Community/CommunityCatchup';

export const CommunityChannelDetail = () => {
  const { odinKey, communityKey: communityId, channelKey: channelId, threadKey } = useParams();
  const { data: community, isFetched } = useCommunity({ odinId: odinKey, communityId }).fetch;
  const navigate = useNavigate();

  const { data: channelDsr } = useCommunityChannel({
    odinId: odinKey,
    communityId: communityId,
    channelId: channelId,
  }).fetch;

  useMarkCommunityAsRead({ communityId, channelId });

  if (!community && isFetched)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  if ((communityId && !community) || (channelId && !channelDsr)) {
    return (
      <div className="h-full w-full flex-grow bg-background">
        <LoadingBlock className="h-16 w-full" />
        <div className="mt-8 flex flex-col gap-4 px-5">
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
          <LoadingBlock className="h-16 w-full" />
        </div>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <div className="h-full w-full flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          {!channelId ? (
            <div className="flex h-full flex-grow flex-col overflow-hidden">
              {/* <CommunityRootHeader community={community || undefined} /> */}
              <CommunityCatchup community={community || undefined} />
            </div>
          ) : (
            <div className="flex h-full flex-grow flex-col overflow-hidden">
              <CommunityChannelHeader community={community || undefined} channel={channelDsr} />
              <ErrorBoundary>
                <CommunityHistory
                  community={community || undefined}
                  channel={channelDsr || undefined}
                  doOpenThread={(thread) =>
                    navigate(
                      `${COMMUNITY_ROOT}/${odinKey}/${communityId}/${channelId}/${thread.fileMetadata.appData.uniqueId}/thread`
                    )
                  }
                />
              </ErrorBoundary>
              <ErrorBoundary>
                <MessageComposer
                  community={community || undefined}
                  channel={channelDsr || undefined}
                  key={channelId}
                />
              </ErrorBoundary>
            </div>
          )}
          {threadKey ? (
            <ErrorBoundary>
              <CommunityThread
                community={community || undefined}
                channel={channelDsr || undefined}
                threadId={threadKey}
              />
            </ErrorBoundary>
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const CommunityChannelHeader = ({
  community,
  channel,
}: {
  community?: HomebaseFile<CommunityDefinition>;
  channel?: HomebaseFile<CommunityChannel>;
}) => {
  const communityId = community?.fileMetadata.appData.uniqueId;
  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  return (
    <>
      {/* <ErrorNotification error={clearChatError || deleteChatError} /> */}
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <Link
          className="-m-1 p-1 lg:hidden"
          type="mute"
          to={`${COMMUNITY_ROOT}/${community?.fileMetadata.senderOdinId}/${communityId}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        {channel ? (
          <a
            onClick={() => setShowChatInfo(true)}
            className="flex cursor-pointer flex-row items-center gap-2"
          >
            # {channel.fileMetadata.appData.content?.title}
          </a>
        ) : null}
      </div>

      {showChatInfo && community && channel ? (
        <ChannelInfo
          community={community}
          channel={channel}
          onClose={() => setShowChatInfo(false)}
        />
      ) : null}
    </>
  );
};

const ChannelInfo = ({
  channel,
  community,
  onClose,
}: {
  channel: HomebaseFile<CommunityChannel>;
  community: HomebaseFile<CommunityDefinition>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const identity = useDotYouClient().getIdentity() || window.location.host;
  const channelContent = channel.fileMetadata.appData.content;
  const communityContent = community.fileMetadata.appData.content;
  const members = communityContent.members;

  const dialog = (
    <DialogWrapper onClose={onClose} title={`# ${channelContent.title}`}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>
          <p>
            {t('Created')}:{' '}
            {formatDateExludingYearIfCurrent(
              new Date(channel.fileMetadata.created || community.fileMetadata.created)
            )}{' '}
            {t('by')}{' '}
            {channel.fileMetadata.senderOdinId && channel.fileMetadata.senderOdinId !== identity ? (
              <AuthorName odinId={channel.fileMetadata.senderOdinId} />
            ) : (
              t('You')
            )}
          </p>
          {channel.fileMetadata.updated !== channel.fileMetadata.created ? (
            <p>
              {t('Last updated')}:{' '}
              {formatDateExludingYearIfCurrent(
                new Date(channel.fileMetadata.updated || community.fileMetadata.updated)
              )}
            </p>
          ) : null}
        </div>

        {members?.length > 1 ? (
          <div>
            <p className="mb-4 text-lg">{t('Members')}</p>
            <div className="flex flex-col gap-4">
              {members.map((recipient) => (
                <a
                  href={`${new DotYouClient({ identity: identity, api: ApiType.Guest }).getRoot()}/owner/connections/${recipient}`}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="group flex flex-row items-center gap-3"
                  key={recipient}
                >
                  <AuthorImage
                    odinId={recipient}
                    className="border border-neutral-200 dark:border-neutral-800"
                    size="sm"
                    excludeLink={true}
                  />
                  <div className="flex flex-col group-hover:underline">
                    <AuthorName odinId={recipient} excludeLink={true} />
                    <p>{recipient}</p>
                  </div>
                  <Arrow className="ml-auto h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

const CommunityThread = ({
  community,
  channel,
  threadId,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  threadId: string;
}) => {
  const { odinKey, communityKey, channelKey } = useParams();

  const { data: originMessage } = useCommunityMessage({
    communityId: community?.fileMetadata.appData.uniqueId,
    messageId: threadId,
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
          href={`${COMMUNITY_ROOT}/${odinKey}/${communityKey}/${channelKey || 'all'}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>
        {t('Thread')}
        <ActionLink
          href={`${COMMUNITY_ROOT}/${odinKey}/${communityKey}/${channelKey || 'all'}`}
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
            threadId={threadId}
            channel={channel}
            key={threadId}
            className="mt-auto lg:mt-0"
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};
