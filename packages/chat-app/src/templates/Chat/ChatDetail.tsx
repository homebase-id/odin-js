import {
  ActionButton,
  ActionGroup,
  ActionGroupOptionProps,
  ChevronDown,
  ConnectionImage,
  ConnectionName,
  EmojiSelector,
  ErrorNotification,
  FileOverview,
  FileSelector,
  ImageIcon,
  SubtleCheck,
  Times,
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
import { useParams } from 'react-router-dom';
import { ChatMediaGallery } from './ChatMediaGallery';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

interface ChatActions {
  doReply: (msg: DriveSearchResult<ChatMessage>) => void;
  doDelete: (msg: DriveSearchResult<ChatMessage>) => void;
}

export const ChatDetail = ({ conversationId }: { conversationId: string | undefined }) => {
  const { data: conversation } = useConversation({ conversationId }).single;
  const [replyMsg, setReplyMsg] = useState<DriveSearchResult<ChatMessage> | undefined>();

  if (!conversationId)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Chat</p>
      </div>
    );

  return (
    <div className="flex h-screen flex-grow flex-col overflow-hidden">
      <ChatHeader conversation={conversation?.fileMetadata.appData.content} />
      <ChatHistory conversation={conversation || undefined} setReplyMsg={setReplyMsg} />
      <ChatComposer
        conversation={conversation || undefined}
        replyMsg={replyMsg}
        clearReplyMsg={() => setReplyMsg(undefined)}
      />
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
  setReplyMsg,
}: {
  conversation: DriveSearchResult<Conversation> | undefined;
  setReplyMsg: (msg: DriveSearchResult<ChatMessage>) => void;
}) => {
  const {
    all: { data: messages },
    delete: { mutate: deleteMessages, error: deleteMessagesError },
  } = useChatMessages({ conversationId: conversation?.fileMetadata?.appData?.uniqueId });
  const flattenedMsgs = useMemo(
    () =>
      (messages?.pages.flatMap((page) => page.searchResults).filter(Boolean) ||
        []) as DriveSearchResult<ChatMessage>[],
    [messages]
  );

  useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });

  const chatActions: ChatActions = {
    doReply: (msg: DriveSearchResult<ChatMessage>) => setReplyMsg(msg),
    doDelete: async (msg: DriveSearchResult<ChatMessage>) => {
      if (!conversation || !msg) return;
      await deleteMessages({
        conversation: conversation,
        messages: [msg],
        deleteForEveryone: true,
      });
    },
  };

  return (
    <>
      <ErrorNotification error={deleteMessagesError} />
      <div className="flex h-full flex-grow flex-col-reverse gap-2 overflow-auto p-5">
        {flattenedMsgs?.map((msg) =>
          msg ? (
            <ChatMessageItem
              key={msg.fileId}
              msg={msg}
              isGroupChat={false}
              chatActions={chatActions}
            />
          ) : null
        )}
      </div>
    </>
  );
};

const ChatMessageItem = ({
  msg,
  isGroupChat,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;
  isGroupChat?: boolean;
  chatActions?: ChatActions;
}) => {
  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;
  const hasMedia = !!msg.fileMetadata.payloads?.length;

  const { chatMessageKey, mediaKey } = useParams();
  const isDetail = stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey) && mediaKey;

  return (
    <>
      {isDetail ? <ChatMediaGallery msg={msg} /> : null}
      <div
        className={`flex gap-2 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} group relative`}
      >
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
            chatActions={chatActions}
          />
        ) : (
          <ChatTextMessageBody
            msg={msg}
            authorOdinId={authorOdinId}
            isGroupChat={isGroupChat}
            messageFromMe={messageFromMe}
            chatActions={chatActions}
          />
        )}
      </div>
    </>
  );
};

const ContextMenu = ({
  msg,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;
  chatActions?: ChatActions;
}) => {
  if (!chatActions) return null;

  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;

  const optionalOptions: ActionGroupOptionProps[] = [];
  if (messageFromMe) {
    optionalOptions.push({
      label: t('Delete'),
      confirmOptions: {
        title: t('Delete message'),
        body: t('Are you sure you want to delete this message?'),
        buttonText: t('Delete'),
      },
      onClick: () => chatActions.doDelete(msg),
    });
  }

  return (
    <ActionGroup
      options={[
        {
          label: t('Reply'),
          onClick: () => chatActions.doReply(msg),
        },
        ...optionalOptions,
      ]}
      className="absolute right-1 top-[0.125rem] z-20 rounded-full bg-background/60 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
      type={'mute'}
      size="square"
    >
      <>
        <ChevronDown className="h-3 w-3" />
        <span className="sr-only ml-1">{t('More')}</span>
      </>
    </ActionGroup>
  );
};

const ChatTextMessageBody = ({
  msg,

  isGroupChat,
  messageFromMe,
  authorOdinId,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;

  isGroupChat?: boolean;
  messageFromMe: boolean;
  authorOdinId: string;
  chatActions?: ChatActions;
}) => {
  const content = msg.fileMetadata.appData.content;
  const isEmojiOnly =
    Array.from(content.message).length === 1 && content.message.match(/\p{Emoji}/u);
  const showBackground = !isEmojiOnly;

  return (
    <div
      className={`relative flex w-auto max-w-md flex-col rounded-lg px-2 py-1 md:flex-row ${
        showBackground
          ? messageFromMe
            ? 'bg-primary/10 dark:bg-primary/30'
            : 'bg-gray-500/10  dark:bg-gray-300/20'
          : ''
      }`}
    >
      {isGroupChat && !messageFromMe ? <ConnectionName odinId={authorOdinId} /> : null}
      <div className="flex flex-col gap-2">
        {msg.fileMetadata.appData.archivalStatus}
        {content.replyId ? <EmbeddedMessageWithId msgId={content.replyId} /> : null}
        <p className={`whitespace-pre-wrap ${isEmojiOnly ? 'text-7xl' : ''}`}>{content.message}</p>
      </div>
      <div className="ml-2 mt-auto flex flex-row-reverse gap-2">
        <ChatDeliveryIndicator msg={msg} />
        <ChatSentTimeIndicator msg={msg} />
      </div>
      <ContextMenu chatActions={chatActions} msg={msg} />
    </div>
  );
};

const ChatMediaMessageBody = ({
  msg,

  isGroupChat,
  messageFromMe,

  authorOdinId,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;

  isGroupChat?: boolean;
  messageFromMe: boolean;

  authorOdinId: string;

  chatActions?: ChatActions;
}) => {
  const content = msg.fileMetadata.appData.content;

  const hasACaption = !!content.message;
  const ChatFooter = ({ className }: { className?: string }) => (
    <>
      <div className={`ml-2 mt-auto flex flex-row-reverse gap-2 ${className || ''}`}>
        <ChatDeliveryIndicator msg={msg} />
        <ChatSentTimeIndicator msg={msg} />
      </div>
      <ContextMenu chatActions={chatActions} msg={msg} />
    </>
  );

  return (
    <div
      className={`w-full max-w-md rounded-lg ${
        messageFromMe ? 'bg-primary/10 dark:bg-primary/30' : 'bg-gray-500/10  dark:bg-gray-300/20'
      }`}
    >
      {isGroupChat && !messageFromMe ? <ConnectionName odinId={authorOdinId} /> : null}
      <div className="relative">
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
    <p className="select-none text-sm text-foreground/50">{children}</p>
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

const ChatComposer = ({
  conversation,
  replyMsg,
  clearReplyMsg,
}: {
  conversation: DriveSearchResult<Conversation> | undefined;
  replyMsg: DriveSearchResult<ChatMessage> | undefined;
  clearReplyMsg: () => void;
}) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input
  const [message, setMessage] = useState<string | undefined>();
  const [files, setFiles] = useState<NewMediaFile[]>();

  const {
    mutate: sendMessage,
    status: sendMessageState,
    reset: resetState,
    error: sendMessageError,
  } = useChatMessage().send;

  const conversationContent = conversation?.fileMetadata.appData.content;
  const doSend = () => {
    if ((!message && !files) || !conversationContent || !conversation.fileMetadata.appData.uniqueId)
      return;
    sendMessage({
      conversationId: conversation.fileMetadata.appData.uniqueId as string,
      message: message || '',
      replyId: replyMsg?.fileMetadata?.appData?.uniqueId,
      files,
      recipients: (conversationContent as GroupConversation).recipients || [
        (conversationContent as SingleConversation).recipient,
      ],
    });
  };

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMessageState === 'success') {
      setMessage('');
      setStateIndex((oldIndex) => oldIndex + 1);
      setFiles([]);
      clearReplyMsg();
      resetState();
    }
  }, [sendMessageState]);

  useEffect(() => {
    if (replyMsg) setFiles([]);
  }, [replyMsg]);

  useEffect(() => {
    if (files?.length) clearReplyMsg();
  }, [files]);

  return (
    <>
      <ErrorNotification error={sendMessageError} />
      <div className="bg-page-background">
        <FileOverview files={files} setFiles={setFiles} className="mt-2" />
        {replyMsg ? <MessageForReply msg={replyMsg} onClear={clearReplyMsg} /> : null}
        <div className="flex flex-shrink-0 flex-row gap-2 px-5 py-3">
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

const MessageForReply = ({
  msg,
  onClear,
}: {
  msg: DriveSearchResult<ChatMessage>;
  onClear: () => void;
}) => {
  return (
    <div className="flex flex-row gap-2 px-5 py-3">
      <EmbeddedMessage msg={msg} />
      <ActionButton icon={Times} type="mute" onClick={onClear}></ActionButton>
    </div>
  );
};

const EmbeddedMessageWithId = ({ msgId, className }: { msgId: string; className?: string }) => {
  const { data: msg } = useChatMessage({ messageId: msgId }).get;
  if (!msg) return null;

  return <EmbeddedMessage msg={msg} className={className} />;
};

const EmbeddedMessage = ({
  msg,
  className,
}: {
  msg: DriveSearchResult<ChatMessage>;
  className?: string;
}) => {
  return (
    <div
      className={`w-full flex-grow rounded-lg border-l-2 border-l-primary bg-primary/10 px-4 py-2 ${
        className || ''
      }`}
    >
      <p className="font-semibold">
        {msg.fileMetadata.senderOdinId ? (
          <ConnectionName odinId={msg.fileMetadata.senderOdinId} />
        ) : (
          t('You')
        )}
      </p>

      <p className="text-foreground">
        {msg.fileMetadata.appData.content.message ? (
          msg.fileMetadata.appData.content.message
        ) : (
          <>📷 {t('Media')}</>
        )}
      </p>
    </div>
  );
};
