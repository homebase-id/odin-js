import {
  ActionGroup,
  ActionLink,
  ChevronDown,
  ChevronLeft,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ErrorNotification,
  OwnerImage,
  OwnerName,
  Persons,
  t,
  useDotYouClient,
  useIsConnected,
} from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import {
  Conversation,
  ConversationWithYourselfId,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { useEffect, useState } from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { ChatMessage } from '../../providers/ChatProvider';
import { ChatHistory } from '../../components/Chat/ChatHistory';
import { ChatComposer } from '../../components/Chat/Composer/ChatComposer';
import { ChatInfo } from '../../components/Chat/Detail/ChatInfo';
import { useNavigate } from 'react-router-dom';
import { CHAT_ROOT } from './ChatHome';

export const ChatDetail = ({ conversationId }: { conversationId: string | undefined }) => {
  const [isEmptyChat, setIsEmptyChat] = useState<boolean>(false);

  const { data: conversation, isLoading, isFetched } = useConversation({ conversationId }).single;
  const { mutate: inviteRecipient } = useConversation().inviteRecipient;
  const [replyMsg, setReplyMsg] = useState<HomebaseFile<ChatMessage> | undefined>();

  if (!conversationId || isLoading || (!conversation && isFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Chat</p>
      </div>
    );

  const onSend = async () => {
    if (isEmptyChat && conversation && conversationId !== ConversationWithYourselfId)
      inviteRecipient({ conversation });
  };

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-grow flex-col overflow-hidden">
        <ChatHeader conversation={conversation || undefined} />
        <GroupChatConnectedState conversation={conversation || undefined} />
        <ErrorBoundary>
          <ChatHistory
            conversation={conversation || undefined}
            setReplyMsg={setReplyMsg}
            setIsEmptyChat={setIsEmptyChat}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <ChatComposer
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
}: {
  conversation: HomebaseFile<Conversation> | undefined;
}) => {
  const navigate = useNavigate();

  const withYourself =
    conversationDsr?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const conversation = conversationDsr?.fileMetadata.appData.content;
  const recipient = (conversation as SingleConversation)?.recipient;
  const [showChatInfo, setShowChatInfo] = useState<boolean>(false);

  const { mutate: clearChat, error: clearChatError } = useConversation().clearChat;
  const {
    mutate: deleteChat,
    error: deleteChatError,
    status: deleteChatStatus,
  } = useConversation().deleteChat;

  useEffect(() => {
    if (deleteChatStatus === 'success') navigate(CHAT_ROOT);
  }, [deleteChatStatus]);

  return (
    <>
      <ErrorNotification error={clearChatError || deleteChatError} />
      <div className="flex flex-row items-center gap-2 bg-page-background p-2 lg:p-5">
        <ActionLink className="lg:hidden" type="mute" href={CHAT_ROOT}>
          <ChevronLeft className="h-5 w-5" />
        </ActionLink>

        <a
          onClick={() => setShowChatInfo(true)}
          className="flex cursor-pointer flex-row items-center gap-2"
        >
          {recipient ? (
            <ConnectionImage
              odinId={recipient}
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
          {recipient ? (
            <ConnectionName odinId={recipient} />
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
  conversation: HomebaseFile<Conversation> | undefined;
}) => {
  if (!conversation) return null;
  const recipients = (conversation.fileMetadata.appData.content as GroupConversation).recipients;
  if (!recipients || recipients.length <= 1) return null;

  return (
    <div className="border-t empty:hidden dark:border-t-slate-800">
      {recipients.map((recipient) => {
        return <RecipientConnectedState recipient={recipient} key={recipient} />;
      })}
    </div>
  );
};

const RecipientConnectedState = ({ recipient }: { recipient: string }) => {
  const { data: isConnected, isFetched } = useIsConnected(recipient);
  const identity = useDotYouClient().getIdentity();

  if (isConnected || !isFetched) return null;
  return (
    <div className="flex w-full flex-row items-center justify-between bg-page-background px-5 py-2">
      <p>
        {t('You can only chat with connected identites, messages will not be delivered to')}:{' '}
        <a href={`https://${recipient}`} className="underline">
          {recipient}
        </a>
      </p>
      <ActionLink href={`https://${identity}/owner/connections/${recipient}/connect`}>
        {t('Connect')}
      </ActionLink>
    </div>
  );
};
