import { ApiType, DotYouClient, HomebaseFile } from '@youfoundation/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import {
  ActionLink,
  Arrow,
  AuthorImage,
  AuthorName,
  ChevronLeft,
  ConnectionImage,
  DialogWrapper,
  ErrorBoundary,
  formatDateExludingYearIfCurrent,
  t,
  Times,
  useDotYouClient,
  usePortal,
} from '@youfoundation/common-app';
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { COMMUNITY_ROOT } from './CommunityHome';
import { CommunityChannel } from '../../providers/CommunityProvider';
import { useCommunityChannel } from '../../hooks/community/channels/useCommunityChannel';
import { createPortal } from 'react-dom';
import { MessageComposer } from '../../components/Community/Message/MessageComposer';
import { CommunityHistory } from '../../components/Community/channel/CommunityHistory';
import { useCommunityMessage } from '../../hooks/community/messages/useCommunityMessage';

export const CommunityChannelDetail = () => {
  const { communityKey, channelKey, threadKey } = useParams();
  const communityId = communityKey;
  const { data: community, isLoading, isFetched } = useCommunity({ communityId }).fetch;
  const navigate = useNavigate();

  const { data: channelDsr, isFetched: isChannelFetched } = useCommunityChannel({
    communityId: communityId,
    channelId: channelKey,
  }).fetch;

  if (!communityId || isLoading || (!community && isFetched) || (!channelDsr && isChannelFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  return (
    <ErrorBoundary>
      <div className="h-full w-full flex-grow bg-background">
        <div className="relative flex h-full flex-row">
          <div className="flex h-full flex-grow flex-col overflow-hidden">
            <CommunityChannelHeader community={community || undefined} channel={channelDsr} />
            <ErrorBoundary>
              <CommunityHistory
                community={community || undefined}
                channel={channelDsr || undefined}
                origin={community || undefined}
                doOpenThread={(thread) =>
                  navigate(
                    `${COMMUNITY_ROOT}/${communityId}/${channelKey}/${thread.fileMetadata.appData.uniqueId}/thread`
                  )
                }
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <MessageComposer
                community={community || undefined}
                groupId={communityId}
                channel={channelDsr || undefined}
                key={channelKey}
              />
            </ErrorBoundary>
          </div>
          {threadKey ? (
            <ErrorBoundary>
              <CommunityThread
                community={community || undefined}
                channel={channelDsr || undefined}
                originId={threadKey}
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
        <ActionLink className="lg:hidden" type="mute" href={`${COMMUNITY_ROOT}/${communityId}`}>
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>

        <a
          onClick={() => setShowChatInfo(true)}
          className="flex cursor-pointer flex-row items-center gap-2"
        >
          # {channel?.fileMetadata.appData.content?.title}
          {/* {singleRecipient ? (
            <ConnectionImage
              odinId={singleRecipient}
              className="border border-neutral-200 dark:border-neutral-800"
              size="sm"
            />
          ) : withYourself ? (
            <div className="h-[3rem] w-[3rem] flex-shrink-0">
              <OwnerImage className="border border-neutral-200 dark:border-neutral-800" size="sm" />
            </div>
          ) : (
            <div className="rounded-full bg-primary/20 p-3">
              <Persons className="h-6 w-6" />
            </div>
          )}
          {singleRecipient ? (
            <ConnectionName odinId={singleRecipient} />
          ) : withYourself ? (
            <>
              <OwnerName />
              <span className="text-sm text-foreground/50">({t('you')})</span>
            </>
          ) : (
            conversation?.title
          )} */}
        </a>

        {/* {conversationDsr && !withYourself ? (
          <ActionGroup
            options={[
              {
                label: t('Chat info'),
                onClick: () => setShowChatInfo(true),
              },
              {
                label: t('Delete'),
                confirmOptions: {
                  title: t('Delete chat'),
                  buttonText: t('Delete'),
                  body: t('Are you sure you want to delete this chat? All messages will be lost.'),
                },
                onClick: () => {
                  deleteChat({ conversation: conversationDsr });
                },
              },
              {
                label: t('Clear'),
                confirmOptions: {
                  title: t('Clear chat'),
                  buttonText: t('Clear'),
                  body: t(
                    'Are you sure you want to clear all messages from this chat? All messages will be lost.'
                  ),
                },
                onClick: () => {
                  clearChat({ conversation: conversationDsr });
                },
              },
              // {label: t('Mute'), onClick: () => {}},
            ]}
            className="ml-auto"
            type={'mute'}
            size="square"
          >
            <>
              <ChevronDown className="h-5 w-5" />
              <span className="sr-only ml-1">{t('More')}</span>
            </>
          </ActionGroup>
        ) : null} */}
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
  const members = communityContent.recipients;

  // const withYourself = conversation?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  // const recipient = recipients.length === 1 ? recipients[0] : undefined;

  // const [isEditTitle, setIsEditTitle] = useState<boolean>(false);
  // const [newTitle, setNewTitle] = useState<string>(channelContent.title || '');

  // const { mutate: updateConversation, status: updateStatus } = useConversation().update;
  // const doSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   conversation.fileMetadata.appData.content.title = newTitle;
  //   updateConversation({
  //     conversation,
  //     distribute: true,
  //   });
  // };

  // useEffect(() => {
  //   updateStatus === 'success' && setIsEditTitle(false);
  // }, [updateStatus]);

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
            {channel.fileMetadata.senderOdinId ? (
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
  originId,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  originId: string;
}) => {
  const { communityKey, channelKey } = useParams();

  const { data: originMessage } = useCommunityMessage({
    communityId: community?.fileMetadata.appData.uniqueId,
    messageId: originId,
  }).get;

  if (!community || !originId || !originMessage) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col shadow-lg xl:static xl:max-w-sm">
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink
          className="p-2 xl:hidden"
          size="none"
          type="mute"
          href={`${COMMUNITY_ROOT}/${communityKey}/${channelKey}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>
        {t('Thread')}
        <ActionLink
          href={`${COMMUNITY_ROOT}/${communityKey}/${channelKey}`}
          icon={Times}
          size="none"
          type="mute"
          className="hidden p-2 lg:-m-2 lg:ml-auto xl:flex"
        />
      </div>
      <div className="flex h-20 flex-grow flex-col overflow-auto bg-background">
        <CommunityHistory
          community={community}
          origin={originMessage}
          channel={channel}
          alignTop={true}
        />

        <ErrorBoundary>
          <MessageComposer
            community={community}
            groupId={originId}
            channel={channel}
            key={originId}
            className="mt-auto lg:mt-0"
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};
