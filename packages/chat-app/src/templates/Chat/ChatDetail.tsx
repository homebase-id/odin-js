import {
  ActionGroup,
  ActionLink,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ErrorNotification,
  HybridLink,
  OwnerImage,
  OwnerName,
  t,
  useDotYouClient,
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
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../providers/ConversationProvider';
import { FC, useEffect, useMemo, useState } from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { ChatMessage } from '../../providers/ChatProvider';
import { ChatHistory } from '../../components/Chat/ChatHistory';
import { ChatComposer, ChatComposerProps } from '../../components/Chat/Composer/ChatComposer';
import { ChatInfo } from '../../components/Chat/Detail/ChatInfo';
import { useNavigate } from 'react-router-dom';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { ROOT_PATH } from '../../app/App';

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
  const rootPath = options?.rootPath || ROOT_PATH;
  const { data: conversation, isLoading, isFetched } = useConversation({ conversationId }).single;
  const { mutate: inviteRecipient } = useConversation().inviteRecipient;
  const [replyMsg, setReplyMsg] = useState<HomebaseFile<ChatMessage> | undefined>();
  const identity = useDotYouClient().getIdentity();

  const Composer = useMemo(() => options?.composer || ChatComposer, [options]);

  if (!conversationId || isLoading || (!conversation && isFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Chat</p>
      </div>
    );

  const onSend = async () => {
    if (
      !conversation ||
      stringGuidsEqual(conversationId, ConversationWithYourselfId) ||
      conversation?.fileMetadata.senderOdinId !== identity
    ) {
      return;
    }

    const filteredRecipients = conversation.fileMetadata.appData.content.recipients.filter(
      (recipient) => recipient !== identity
    );

    const anyRecipientMissingConversation = filteredRecipients.some((recipient) => {
      const latestTransferStatus =
        conversation.serverMetadata?.transferHistory?.recipients[recipient].latestTransferStatus;

      if (!latestTransferStatus) return true;
      return FailedTransferStatuses.includes(latestTransferStatus);
    });
    if (anyRecipientMissingConversation) {
      console.log('invite recipient');
      inviteRecipient({ conversation });
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
  conversation: HomebaseFile<UnifiedConversation> | undefined;
  rootPath: string;
}) => {
  const navigate = useNavigate();
  const identity = useDotYouClient().getIdentity();

  const withYourself =
    conversationDsr?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const conversation = conversationDsr?.fileMetadata.appData.content;
  const recipients = conversation?.recipients;
  const singleRecipient =
    recipients && recipients.length === 2
      ? recipients.filter((recipient) => recipient !== identity)[0]
      : undefined;

  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  const { mutate: clearChat, error: clearChatError } = useConversation().clearChat;
  const {
    mutate: deleteChat,
    error: deleteChatError,
    status: deleteChatStatus,
  } = useConversation().deleteChat;

  useEffect(() => {
    if (deleteChatStatus === 'success') navigate(rootPath);
  }, [deleteChatStatus]);

  return (
    <>
      <ErrorNotification error={clearChatError || deleteChatError} />
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <HybridLink className="-m-1 p-1 lg:hidden" type="mute" href={rootPath}>
          <ChevronLeft className="h-4 w-4" />
        </HybridLink>

        <a
          onClick={() => setShowChatInfo(true)}
          className="flex cursor-pointer flex-row items-center gap-2"
        >
          {singleRecipient ? (
            <ConnectionImage
              odinId={singleRecipient}
              className="h-[2rem] w-[2rem] border border-neutral-200 dark:border-neutral-800 lg:h-[3rem] lg:w-[3rem]"
              size="custom"
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
          )}
        </a>

        {conversationDsr && !withYourself ? (
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
        ) : null}
      </div>

      {showChatInfo && conversationDsr ? (
        <ChatInfo conversation={conversationDsr} onClose={() => setShowChatInfo(false)} />
      ) : null}
    </>
  );
};

const GroupChatConnectedState = ({
  conversation,
}: {
  conversation: HomebaseFile<UnifiedConversation> | undefined;
}) => {
  const identity = useDotYouClient().getIdentity();

  if (!conversation) return null;
  const recipients = conversation.fileMetadata.appData.content.recipients;
  if (!recipients || recipients.length <= 2) return null;

  return (
    <div className="border-t empty:hidden dark:border-t-slate-800">
      {recipients
        .filter((recipient) => recipient !== identity)
        .map((recipient) => {
          return <RecipientConnectedState recipient={recipient} key={recipient} />;
        })}
    </div>
  );
};

const RecipientConnectedState = ({ recipient }: { recipient: string }) => {
  const { data: isConnected, isFetched } = useIsConnected(recipient);
  const host = useDotYouClient().getDotYouClient().getRoot();

  if (isConnected === null || isConnected || !isFetched) return null;
  return (
    <div className="flex w-full flex-row items-center justify-between bg-page-background px-5 py-2">
      <p>
        {t('You can only chat with connected identities, messages will not be delivered to')}:{' '}
        <a
          href={`${new DotYouClient({ identity: recipient, api: ApiType.Guest }).getRoot()}`}
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
};
