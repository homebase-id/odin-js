import {
  ConnectionImage,
  ConnectionName,
  ellipsisAtMaxChar,
  t,
  OwnerImage,
  OwnerName,
  LoadingBlock,
  getPlainTextFromRichText,
  useDotYouClientContext,
  ActionGroup,
  CHAT_ROOT_PATH,
  ErrorNotification,
} from '@homebase-id/common-app';
import { ChevronDown, Persons } from '@homebase-id/common-app/icons';
import { memo, ReactNode, useEffect, useMemo } from 'react';
import { useChatMessages } from '../../../../hooks/chat/useChatMessages';
import {
  CHAT_LINKS_PAYLOAD_KEY,
  ChatDeletedArchivalStaus,
  ChatMessage,
} from '../../../../providers/ChatProvider';
import { ChatDeliveryIndicator } from '../../Detail/ChatDeliveryIndicator';
import { MessageDeletedInnerBody } from '../../Detail/ChatMessageItem';
import { ChatSentTimeIndicator } from '../../Detail/ChatSentTimeIndicator';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../../../providers/ConversationProvider';
import { useConversationMetadata } from '../../../../hooks/chat/useConversationMetadata';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { useNavigate, useParams } from 'react-router-dom';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

const ListItemWrapper = ({
  onClick,
  isActive,
  children,
}: {
  onClick: (() => void) | undefined;
  isActive: boolean;
  children: ReactNode;
}) => (
  <div className="group px-2">
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-primary/20 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : 'bg-transparent'
      }`}
    >
      {children}
    </div>
  </div>
);
export const ConversationListItemWrapper = ListItemWrapper;

export const GroupConversationItem = ({
  title,
  conversationId,
  ...props
}: {
  onClick: (() => void) | undefined;
  title: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  return (
    <ListItemWrapper {...props}>
      <div className="rounded-full bg-primary/20 p-4">
        <Persons className="h-5 w-5" />
      </div>
      <ConversationBody title={title} conversationId={conversationId} />
    </ListItemWrapper>
  );
};

export const SingleConversationItem = ({
  odinId,
  conversationId,
  ...props
}: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  return (
    <ListItemWrapper {...props}>
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConversationBody
        title={<ConnectionName odinId={odinId} />}
        conversationId={conversationId}
      />
    </ListItemWrapper>
  );
};

export const ConversationWithYourselfItem = ({
  onClick,
  isActive,
}: {
  onClick: () => void;
  isActive: boolean;
}) => {
  return (
    <ListItemWrapper isActive={isActive} onClick={onClick}>
      <div className="h-[3rem] w-[3rem] flex-shrink-0">
        <OwnerImage
          className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
          size="sm"
        />
      </div>
      <ConversationBody
        title={
          <>
            <OwnerName /> <span className="text-sm text-foreground/50">({t('you')})</span>
          </>
        }
        conversationId={ConversationWithYourselfId}
      />
    </ListItemWrapper>
  );
};

const ConversationBody = ({
  title,
  conversationId,
}: {
  title: string | ReactNode | undefined;
  conversationId?: string;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const { data: conversationMetadata } = useConversationMetadata({ conversationId }).single;
  const { data: conversation } = useConversation({ conversationId }).single;
  const { data, isFetched: fetchedMessages } = useChatMessages({ conversationId }).all;
  const flatMessages = useMemo(
    () =>
      data?.pages
        ?.flatMap((page) => page?.searchResults)
        ?.filter(Boolean) as HomebaseFile<ChatMessage>[],
    [data]
  );
  const lastMessage = useMemo(() => flatMessages?.[0], [flatMessages]);

  const lastReadTime = conversationMetadata?.lastReadTime || 0;
  const unreadCount =
    conversationMetadata &&
    flatMessages &&
    lastMessage?.fileMetadata.senderOdinId &&
    lastMessage?.fileMetadata.senderOdinId !== loggedOnIdentity
      ? flatMessages.filter(
          (msg) =>
            msg.fileMetadata.senderOdinId !== loggedOnIdentity &&
            (msg.fileMetadata.transitCreated || msg.fileMetadata.created) > lastReadTime
        )?.length
      : 0;

  const hasNoContextMenu = stringGuidsEqual(conversationId, ConversationWithYourselfId);

  return (
    <>
      <div className="flex w-20 flex-grow flex-col gap-1">
        <div className="flex flex-row justify-between gap-2 overflow-hidden">
          <p className="font-semibold">
            {typeof title === 'string' ? ellipsisAtMaxChar(title, 25) : title}
          </p>

          <div
            className={`ml-auto flex flex-row items-center gap-2 duration-500 ${hasNoContextMenu ? '' : 'translate-x-8 transition-transform md:group-hover:translate-x-0'}`}
          >
            {lastMessage ? (
              <ChatSentTimeIndicator
                msg={lastMessage}
                keepDetail={false}
                className="whitespace-nowrap"
              />
            ) : null}
            {conversation && !hasNoContextMenu ? (
              <ConversationContextMenu conversation={conversation} />
            ) : null}
          </div>
        </div>
        <div className="flex flex-row items-center gap-1">
          {lastMessage ? <ChatDeliveryIndicator msg={lastMessage} /> : null}

          <div className="w-20 flex-grow leading-tight text-foreground/80">
            {lastMessage ? (
              <MessageContent {...lastMessage} />
            ) : !fetchedMessages && conversationId ? (
              <LoadingBlock className="h-5 w-full flex-grow bg-slate-300 dark:bg-slate-200" />
            ) : null}
          </div>

          {unreadCount ? (
            <div className="flex h-7 w-7 flex-shrink-0 flex-row items-center justify-center rounded-full bg-primary text-sm text-primary-contrast">
              {Math.min(unreadCount, 10)}
              {unreadCount >= 10 ? '+' : ''}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export const MessageContent = memo((message: HomebaseFile<ChatMessage>) => {
  const lastMessageContent = message.fileMetadata.appData.content;
  const plainLastMessageContent = getPlainTextFromRichText(lastMessageContent?.message);

  const textMessage = message.fileMetadata.appData.content.message;
  const { payloads } = message.fileMetadata;
  if (message.fileMetadata.appData.archivalStatus === ChatDeletedArchivalStaus) {
    return <MessageDeletedInnerBody />;
  }
  if (textMessage?.length > 0) {
    return (
      <p className="overflow-hidden text-ellipsis whitespace-nowrap">{plainLastMessageContent}</p>
    );
  } else if (payloads && payloads?.length > 1) {
    return <p>📸 {t('Medias')}</p>;
  } else {
    const payload = payloads?.[0];
    if (!payload) return null;
    if (payload.contentType.startsWith('image')) {
      return <p>📷 {t('Image')}</p>;
    } else if (
      payload.contentType.startsWith('video') ||
      payload.contentType === 'application/vnd.apple.mpegurl'
    ) {
      return <p>🎥 {t('Video')}</p>;
    } else if (payload.contentType.startsWith('audio')) {
      return <p>🎵 {t('Audio')}</p>;
    } else if (payload.key === CHAT_LINKS_PAYLOAD_KEY) {
      return <p>🔗 {t('Link')}</p>;
    } else {
      return <p>📄 {t('File')}</p>;
    }
  }
});
MessageContent.displayName = 'MessageContent';

export const ConversationContextMenu = ({
  conversation,
}: {
  conversation: HomebaseFile<UnifiedConversation>;
}) => {
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

  const navigate = useNavigate();
  const { conversationKey } = useParams();
  useEffect(() => {
    if (
      deleteChatStatus === 'success' &&
      stringGuidsEqual(conversationKey, conversation.fileMetadata.appData.uniqueId)
    )
      navigate(CHAT_ROOT_PATH);
  }, [deleteChatStatus]);

  useEffect(() => {
    if (
      archiveChatStatus === 'success' &&
      stringGuidsEqual(conversationKey, conversation.fileMetadata.appData.uniqueId)
    )
      navigate(CHAT_ROOT_PATH);
  }, [archiveChatStatus]);

  if (stringGuidsEqual(conversation.fileMetadata.appData.uniqueId, ConversationWithYourselfId))
    return null;
  return (
    <>
      <ErrorNotification
        error={clearChatError || deleteChatError || restoreChatError || archiveChatError}
      />
      <ActionGroup
        type="mute"
        size="none"
        alwaysInPortal={true}
        options={[
          {
            label: t('Chat info'),
            href: `${CHAT_ROOT_PATH}/${conversation?.fileMetadata.appData.uniqueId}/info${window.location.search}`,
          },
          conversation.fileMetadata.appData.archivalStatus !== 2
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
                  deleteChat({ conversation: conversation });
                },
              }
            : undefined,
          conversation.fileMetadata.appData.archivalStatus !== 3
            ? {
                label: t('Archive'),
                confirmOptions: {
                  title: t('Archive chat'),
                  buttonText: t('Archive'),
                  body: t(`Are you sure you want archive this chat?`),
                  type: 'info',
                },
                onClick: () => {
                  archiveChat({ conversation: conversation });
                },
              }
            : {
                label: t('Restore'),
                onClick: () => {
                  restoreChat({ conversation: conversation });
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
              clearChat({ conversation: conversation });
            },
          },
        ]}
        className="my-auto flex-shrink-0 rounded-lg bg-background"
      >
        <span className="block p-1">
          <ChevronDown className="h-4 w-4" />
        </span>
      </ActionGroup>
    </>
  );
};
