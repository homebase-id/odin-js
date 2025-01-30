import {
  ActionGroup,
  ActionLink,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ErrorNotification,
  HybridLink,
  OwnerImage,
  OwnerName,
  t,
  useDotYouClientContext,
  useIntroductions,
  useIsConnected,
} from '@homebase-id/common-app';
import { ChevronDown, ChevronLeft, Persons } from '@homebase-id/common-app/icons';
import {
  ApiType,
  DotYouClient,
  FailedTransferStatuses,
  HomebaseFile,
} from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../providers/ConversationProvider';
import { FC, useEffect, useMemo, useState } from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { ChatMessage } from '../../providers/ChatProvider';
import { ChatHistory } from '../../components/Chat/ChatHistory';
import { ChatComposer, ChatComposerProps } from '../../components/Chat/Composer/ChatComposer';
import { ChatInfo } from '../../components/Chat/Detail/ChatInfo';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const ChatDetail = ({
  conversationId,
  communityTagId,
  options,
}: {
  conversationId: string | undefined;
  communityTagId?: string;
  options?: {
    rootPath?: string;
    composer?: FC<ChatComposerProps>;
  };
}) => {
  const rootPath = options?.rootPath || CHAT_ROOT_PATH;
  const { data: conversation, isLoading, isFetched } = useConversation({ conversationId }).single;
  const { mutate: inviteRecipient } = useConversation().inviteRecipient;
  const { mutate: introduceIdentities } = useIntroductions().introduceIdentities;
  const [replyMsg, setReplyMsg] = useState<HomebaseFile<ChatMessage> | undefined>();
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const Composer = useMemo(() => options?.composer || ChatComposer, [options]);

  if (!conversationId || isLoading || (!conversation && isFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Chat</p>
      </div>
    );

  const onSend = async () => {
    const firstOfSeptember2024 = new Date('2024-08-01').getTime();
    if (
      !conversation ||
      stringGuidsEqual(conversationId, ConversationWithYourselfId) ||
      conversation?.fileMetadata.senderOdinId !== loggedOnIdentity ||
      conversation.fileMetadata.created <= firstOfSeptember2024
    ) {
      return;
    }

    const filteredRecipients = conversation.fileMetadata.appData.content.recipients.filter(
      (recipient) => recipient !== loggedOnIdentity
    );

    const anyRecipientMissingConversation = filteredRecipients.some((recipient) => {
      if (!conversation.serverMetadata?.transferHistory?.recipients[recipient]) {
        console.log('missing?', conversation);
      }

      const latestTransferStatus =
        conversation.serverMetadata?.transferHistory?.recipients[recipient]?.latestTransferStatus;

      if (!latestTransferStatus) return true;
      return FailedTransferStatuses.includes(latestTransferStatus);
    });
    if (anyRecipientMissingConversation) {
      console.log('invite recipient');
      inviteRecipient({ conversation });
      if (filteredRecipients.length > 1) {
        // Group chat; Good to introduce everyone
        await introduceIdentities({
          message: t('{0} has added you to a group chat', loggedOnIdentity || ''),
          recipients: filteredRecipients,
        });
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-grow flex-col overflow-hidden">
        <ChatHeader conversation={conversation || undefined} rootPath={rootPath} />
        <GroupChatConnectedState conversation={conversation || undefined} />
        <ErrorBoundary>
          <ChatHistory conversation={conversation || undefined} setReplyMsg={setReplyMsg} />
        </ErrorBoundary>
        <ErrorBoundary key={conversationId}>
          <Composer
            tags={communityTagId ? [communityTagId] : undefined}
            conversation={conversation || undefined}
            replyMsg={replyMsg}
            clearReplyMsg={() => setReplyMsg(undefined)}
            onSend={onSend}
            key={conversationId}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

const ChatHeader = ({
  conversation: conversationDsr,
  rootPath,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata> | undefined;
  rootPath: string;
}) => {
  const navigate = useNavigate();
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

  const withYourself =
    conversationDsr?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const conversation = conversationDsr?.fileMetadata.appData.content;
  const recipients = conversation?.recipients;
  const singleRecipient =
    recipients && recipients.length === 2
      ? recipients.filter((recipient) => recipient !== loggedOnIdentity)[0]
      : undefined;

  const infoChatMatch = useMatch({ path: `${rootPath}/:conversationKey/info` });
  const showChatInfo = !!infoChatMatch;

  const { mutate: clearChat, error: clearChatError } = useConversation().clearChat;
  const {
    mutate: deleteChat,
    error: deleteChatError,
    status: deleteChatStatus,
  } = useConversation().deleteChat;
  const {
    mutate: archiveChat,
    error: archiveChatError,
    status: archiveChatStatus,
  } = useConversation().archiveChat;
  const { mutate: restoreChat, error: restoreChatError } = useConversation().restoreChat;
  const { mutate: introduceIdentities, error: makeIntroductionError } =
    useIntroductions().introduceIdentities;

  const makeIntroduction = async () => {
    if (!conversation) return;

    const filteredRecipients = conversation.recipients.filter(
      (recipient) => recipient !== loggedOnIdentity
    );

    await introduceIdentities({
      message: t('{0} has added you to a group chat', loggedOnIdentity || ''),
      recipients: filteredRecipients,
    });
  };

  useEffect(() => {
    if (deleteChatStatus === 'success') navigate(rootPath);
  }, [deleteChatStatus]);

  useEffect(() => {
    if (archiveChatStatus === 'success') navigate(rootPath);
  }, [archiveChatStatus]);

  return (
    <>
      <ErrorNotification
        error={
          clearChatError ||
          deleteChatError ||
          restoreChatError ||
          archiveChatError ||
          makeIntroductionError
        }
      />
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-3">
        <HybridLink className="-m-1 p-1 lg:hidden" type="mute" href={rootPath}>
          <ChevronLeft className="h-4 w-4" />
        </HybridLink>

        <Link
          to={`${rootPath}/${conversationDsr?.fileMetadata.appData.uniqueId}/info`}
          className="flex cursor-pointer flex-row items-center gap-2"
        >
          {singleRecipient ? (
            <ConnectionImage
              odinId={singleRecipient}
              className="h-[2rem] w-[2rem] border border-neutral-200 dark:border-neutral-800 lg:h-[2.5rem] lg:w-[2.5rem]"
              size="custom"
            />
          ) : withYourself ? (
            <OwnerImage
              className="h-[2rem] w-[2rem] flex-shrink-0 border border-neutral-200 dark:border-neutral-800 lg:h-[2.5rem] lg:w-[2.5rem]"
              size="custom"
            />
          ) : (
            <div className="rounded-full bg-primary/20 p-2 lg:p-3">
              <Persons className="h-[0.9rem] w-[0.9rem] lg:h-4 lg:w-4" />
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
          )}
        </Link>

        {conversationDsr && !withYourself ? (
          <ActionGroup
            options={[
              {
                label: t('Chat info'),
                href: `${rootPath}/${conversationDsr?.fileMetadata.appData.uniqueId}/info${window.location.search}`,
              },
              !singleRecipient
                ? {
                    label: t('Introduce everyone'),
                    onClick: makeIntroduction,
                  }
                : undefined,
              conversationDsr.fileMetadata.appData.archivalStatus !== 2
                ? {
                    label: t('Delete'),
                    confirmOptions: {
                      title: t('Delete chat'),
                      buttonText: t('Delete'),
                      body: t(
                        `Are you sure you want to delete this chat and all messages? The messages will be lost and can't be recoved.`
                      ),
                    },
                    onClick: () => {
                      deleteChat({ conversation: conversationDsr });
                    },
                  }
                : undefined,
              conversationDsr.fileMetadata.appData.archivalStatus !== 3
                ? {
                    label: t('Archive'),
                    confirmOptions: {
                      title: t('Archive chat'),
                      buttonText: t('Archive'),
                      body: t(`Are you sure you want archive this chat?`),
                      type: 'info',
                    },
                    onClick: () => {
                      archiveChat({ conversation: conversationDsr });
                    },
                  }
                : {
                    label: t('Restore'),
                    onClick: () => {
                      restoreChat({ conversation: conversationDsr });
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
        ) : null}
      </div>

      {showChatInfo && conversationDsr ? (
        <ChatInfo conversation={conversationDsr} onClose={() => navigate(-1)} />
      ) : null}
    </>
  );
};

const GroupChatConnectedState = ({
  conversation,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata> | undefined;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

  if (!conversation) return null;
  const recipients = conversation.fileMetadata.appData.content.recipients;
  if (!recipients) return null;

  return (
    <div className="border-t empty:hidden dark:border-t-slate-800">
      {recipients
        .filter((recipient) => recipient !== loggedOnIdentity)
        .map((recipient) => {
          return <RecipientConnectedState recipient={recipient} key={recipient} />;
        })}
    </div>
  );
};

const RecipientConnectedState = ({ recipient }: { recipient: string }) => {
  const { data: isConnected, isFetched: isFetchedConnected } = useIsConnected(recipient);
  const host = useDotYouClientContext().getRoot();

  if (!isConnected && isFetchedConnected) {
    return (
      <div className="flex w-full flex-row items-center justify-between bg-page-background px-5 py-2">
        <p>
          {t('You can only chat with connected identities, messages will not be delivered to')}:{' '}
          <a
            href={`${new DotYouClient({ hostIdentity: recipient, api: ApiType.Guest }).getRoot()}`}
            className="underline"
          >
            {recipient}
          </a>
        </p>
        <ActionLink href={`${host}/owner/connections/${recipient}/connect`}>
          {t('Connect')}
        </ActionLink>
      </div>
    );
  }

  return null;
};
