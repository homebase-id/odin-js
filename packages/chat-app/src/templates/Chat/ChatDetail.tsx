import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  EmojiSelector,
  ErrorNotification,
  FileOverview,
  FileSelector,
  ImageIcon,
  SubtleCheck,
  VolatileInput,
  t,
  useDotYouClient,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { useEffect, useMemo, useState } from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { useChatMessage } from '../../hooks/chat/useChatMessage';
import { useChatMessages } from '../../hooks/chat/useChatMessages';
import { format } from '@youfoundation/common-app/src/helpers/timeago';
import { ChatMessage, ChatDeliveryStatus } from '../../providers/ChatProvider';
import { NewMediaFile } from '@youfoundation/js-lib/public';
import { useMarkMessagesAsRead } from '../../hooks/chat/useMarkMessagesAsRead';
import { ChatMedia } from './ChatMedia';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatMediaGallery } from './ChatMediaGallery';

export const ChatDetail = ({ conversationId }: { conversationId: string | undefined }) => {
  const { data: conversation } = useConversation({ conversationId }).single;

  if (!conversationId)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Chat</p>
      </div>
    );

  return (
    <div className="flex h-screen flex-grow flex-col overflow-hidden">
      <ChatHeader conversation={conversation?.fileMetadata.appData.content} />
      <ChatHistory conversation={conversation || undefined} />
      <ChatComposer conversation={conversation?.fileMetadata.appData.content} />
    </div>
  );
};

const ChatHeader = ({ conversation }: { conversation: Conversation | undefined }) => {
  const recipients = (conversation as SingleConversation)?.recipient;

  return (
    <div className="flex flex-row items-center gap-2 bg-page-background p-5 ">
      <ConnectionImage
        odinId={recipients}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConnectionName odinId={recipients} />
    </div>
  );
};

const ChatHistory = ({
  conversation,
}: {
  conversation: DriveSearchResult<Conversation> | undefined;
}) => {
  const conversationContent = conversation?.fileMetadata.appData.content;
  const {
    all: { data: messages },
  } = useChatMessages({ conversationId: conversationContent?.conversationId });
  const flattenedMsgs = useMemo(
    () =>
      (messages?.pages.flatMap((page) => page.searchResults).filter(Boolean) ||
        []) as DriveSearchResult<ChatMessage>[],
    [messages]
  );

  useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });

  return (
    <div className="flex h-full flex-grow flex-col-reverse gap-2 overflow-auto p-5">
      {flattenedMsgs?.map((msg) =>
        msg ? <ChatMessageItem key={msg.fileId} msg={msg} isGroupChat={false} /> : null
      )}
    </div>
  );
};

const ChatMessageItem = ({
  msg,
  isGroupChat,
}: {
  msg: DriveSearchResult<ChatMessage>;
  isGroupChat: boolean;
}) => {
  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;
  const hasMedia = !!msg.fileMetadata.payloads?.length;

  const { chatMessageKey, mediaKey } = useParams();
  const isDetail = msg.fileMetadata.appData.content.id === chatMessageKey && mediaKey;

  return (
    <>
      {isDetail ? <ChatMediaGallery msg={msg} /> : null}
      <div className={`flex gap-2 ${messageFromMe ? 'flex-row-reverse text-right' : 'flex-row'}`}>
        {isGroupChat && !messageFromMe ? (
          <ConnectionImage
            odinId={authorOdinId}
            className="border border-neutral-200 dark:border-neutral-800"
            size="sm"
          />
        ) : null}

        {hasMedia ? (
          <ChatMediaMessageBody
            msg={msg}
            authorOdinId={authorOdinId}
            isGroupChat={isGroupChat}
            messageFromMe={messageFromMe}
          />
        ) : (
          <ChatTextMessageBody
            msg={msg}
            authorOdinId={authorOdinId}
            isGroupChat={isGroupChat}
            messageFromMe={messageFromMe}
          />
        )}
      </div>
    </>
  );
};

const ChatTextMessageBody = ({
  msg,

  isGroupChat,
  messageFromMe,
  authorOdinId,
}: {
  msg: DriveSearchResult<ChatMessage>;

  isGroupChat: boolean;
  messageFromMe: boolean;
  authorOdinId: string;
}) => {
  const content = msg.fileMetadata.appData.content;
  const isEmojiOnly =
    Array.from(content.message).length === 1 && content.message.match(/\p{Emoji}/u);
  const showBackground = !isEmojiOnly;

  return (
    <div
      className={`flex w-auto max-w-md flex-col rounded-lg px-2 py-1 md:flex-row ${
        showBackground
          ? messageFromMe
            ? 'bg-primary/10 dark:bg-primary/30'
            : 'bg-gray-500/10  dark:bg-gray-300/20'
          : ''
      }`}
    >
      {isGroupChat && !messageFromMe ? <ConnectionName odinId={authorOdinId} /> : null}
      <p className={`whitespace-pre-wrap ${isEmojiOnly ? 'text-7xl' : ''}`}>{content.message}</p>
      <div className="ml-2 mt-auto flex flex-row-reverse gap-2">
        <ChatDeliveryIndicator msg={msg} />
        <ChatSentTimeIndicator msg={msg} />
      </div>
    </div>
  );
};

const ChatMediaMessageBody = ({
  msg,

  isGroupChat,
  messageFromMe,

  authorOdinId,
}: {
  msg: DriveSearchResult<ChatMessage>;

  isGroupChat: boolean;
  messageFromMe: boolean;

  authorOdinId: string;
}) => {
  const content = msg.fileMetadata.appData.content;

  const hasACaption = !!content.message;
  const ChatFooter = ({ className }: { className?: string }) => (
    <div className={`ml-2 mt-auto flex flex-row-reverse gap-2 ${className || ''}`}>
      <ChatDeliveryIndicator msg={msg} />
      <ChatSentTimeIndicator msg={msg} />
    </div>
  );

  return (
    <div
      className={`w-full max-w-md rounded-lg ${
        messageFromMe ? 'bg-primary/10 dark:bg-primary/30' : 'bg-gray-500/10  dark:bg-gray-300/20'
      }`}
    >
      {isGroupChat && !messageFromMe ? <ConnectionName odinId={authorOdinId} /> : null}
      <div className="relative overflow-hidden rounded-lg">
        <ChatMedia msg={msg} />
        {!hasACaption ? <ChatFooter className="absolute bottom-0 right-0 z-10 px-2 py-1" /> : null}
      </div>
      {hasACaption ? (
        <div className="flex flex-col px-2 py-2 md:flex-row md:justify-between">
          <p className="whitespace-pre-wrap">{content.message}</p>
          <ChatFooter />
        </div>
      ) : null}
    </div>
  );
};

export const ChatSentTimeIndicator = ({ msg }: { msg: DriveSearchResult<ChatMessage> }) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-foreground/50">{children}</p>
  );

  const date = new Date(msg.fileMetadata.created);
  if (!date) return <Wrapper>{t('Unknown')}</Wrapper>;

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  if (date > oneHourAgo)
    return <Wrapper>{format(date).replaceAll('ago', '').replaceAll('just', '')}</Wrapper>;

  // if date is not today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) {
    const timeFormat: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
    };
    return <Wrapper>{date.toLocaleTimeString(undefined, timeFormat)}</Wrapper>;
  }

  // if date is this week
  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
  if (date >= thisWeek) {
    const weekdayFormat: Intl.DateTimeFormatOptions = {
      weekday: 'short',
    };
    return <Wrapper>{date.toLocaleDateString(undefined, weekdayFormat)}</Wrapper>;
  }

  const now = new Date();
  const yearsAgo = Math.abs(new Date(now.getTime() - date.getTime()).getUTCFullYear() - 1970);
  const monthsAgo = Math.abs(now.getMonth() - date.getMonth());
  const dateTimeFormat: Intl.DateTimeFormatOptions = {
    month: yearsAgo !== 0 || monthsAgo !== 0 ? 'short' : undefined,
    day: 'numeric',
    weekday: 'short',
    year: yearsAgo !== 0 ? 'numeric' : undefined,
    hour: 'numeric',
    minute: 'numeric',
  };
  return <Wrapper>{date.toLocaleDateString(undefined, dateTimeFormat)}</Wrapper>;
};

export const ChatDeliveryIndicator = ({ msg }: { msg: DriveSearchResult<ChatMessage> }) => {
  const identity = useDotYouClient().getIdentity();
  const content = msg.fileMetadata.appData.content;
  const authorOdinId = msg.fileMetadata.senderOdinId;
  const messageFromMe = !authorOdinId || authorOdinId === identity;

  if (!messageFromMe) return null;

  const isDelivered = content.deliveryStatus >= ChatDeliveryStatus.Delivered;
  const isRead = content.deliveryStatus === ChatDeliveryStatus.Read;

  return (
    <div
      className={`${isDelivered ? '-ml-2' : ''} flex flex-row drop-shadow-md ${
        isRead ? 'text-blue-600 ' : 'text-foreground/60'
      }`}
    >
      {isDelivered ? <SubtleCheck className="relative -right-2 z-10 h-4 w-4" /> : null}
      <SubtleCheck className="h-4 w-4" />
    </div>
  );
};

const ChatComposer = ({ conversation }: { conversation: Conversation | undefined }) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input
  const [message, setMessage] = useState<string | undefined>();
  const [files, setFiles] = useState<NewMediaFile[]>();

  const {
    mutate: sendMessage,
    status: sendMessageState,
    reset: resetState,
    error: sendMessageError,
  } = useChatMessage().send;
  const doSend = () => {
    if ((!message && !files) || !conversation) return;
    sendMessage({
      conversationId: conversation.conversationId,
      message: message || '',
      files,
      recipients: (conversation as GroupConversation).recipients || [
        (conversation as SingleConversation).recipient,
      ],
    });
  };

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMessageState === 'success') {
      setMessage('');
      setStateIndex((oldIndex) => oldIndex + 1);
      setFiles([]);
      resetState();
    }
  }, [sendMessageState]);

  return (
    <>
      <ErrorNotification error={sendMessageError} />
      <div className="bg-page-background">
        <FileOverview files={files} setFiles={setFiles} className="mt-2" />
        <div className="flex flex-shrink-0 flex-row gap-2  px-5 py-3">
          <div className="my-auto flex flex-row items-center gap-1">
            <EmojiSelector
              size="none"
              className="px-1 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
              onInput={(val) => setMessage((oldVal) => (oldVal ? `${oldVal} ${val}` : val))}
            />
            <FileSelector
              onChange={(files) => setFiles(files.map((file) => ({ file })))}
              className="text-foreground text-opacity-30 hover:text-opacity-100"
            >
              <ImageIcon className="h-5 w-5" />
            </FileSelector>
          </div>

          <VolatileInput
            key={stateIndex}
            placeholder="Your message"
            defaultValue={message}
            className="rounded-md border bg-background p-2 dark:border-slate-800"
            onChange={setMessage}
            onSubmit={(val) => {
              setMessage(val);
              doSend();
            }}
          />
          <ActionButton type="secondary" onClick={doSend} state={sendMessageState}>
            {t('Send')}
          </ActionButton>
        </div>
      </div>
    </>
  );
};
