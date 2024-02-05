import {
  useDotYouClient,
  ConnectionImage,
  ConnectionName,
  Block,
  t,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ChatMessage, ChatDeletedArchivalStaus } from '../../../providers/ChatProvider';
import { Conversation, GroupConversation } from '../../../providers/ConversationProvider';
import { ChatMedia } from './Media/ChatMedia';
import { ChatMediaGallery } from './Media/ChatMediaGallery';
import { ChatDeliveryIndicator } from './ChatDeliveryIndicator';
import { ChatSentTimeIndicator } from './ChatSentTimeIndicator';
import { ChatActions, ContextMenu } from './ContextMenu';
import { EmbeddedMessageWithId } from './EmbeddedMessage';
import { useParams } from 'react-router-dom';
import { ChatReactionComposer } from '../Composer/ChatReactionComposer';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';

export const ChatMessageItem = ({
  msg,
  conversation,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;
  conversation?: DriveSearchResult<Conversation>;
  chatActions?: ChatActions;
}) => {
  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;
  const hasMedia = !!msg.fileMetadata.payloads?.length;

  const { chatMessageKey, mediaKey } = useParams();
  const isDetail = stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey) && mediaKey;

  const isDeleted = msg.fileMetadata.appData.archivalStatus === ChatDeletedArchivalStaus;

  const isGroupChat = !!(conversation?.fileMetadata.appData.content as GroupConversation)
    ?.recipients;

  const hasReactions = useChatReaction({
    messageId: msg.fileMetadata.appData.uniqueId,
    conversationId: conversation?.fileMetadata.appData.uniqueId,
  }).get.data?.length;

  return (
    <>
      {isDetail ? <ChatMediaGallery msg={msg} /> : null}
      <div
        className={`flex gap-2 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} group relative ${hasReactions ? 'pb-4' : ''}`}
      >
        {isGroupChat && !messageFromMe ? (
          <ConnectionImage
            odinId={authorOdinId}
            className="border border-neutral-200 dark:border-neutral-800"
            size="sm"
          />
        ) : null}

        {hasMedia && !isDeleted ? (
          <ChatMediaMessageBody
            msg={msg}
            conversation={conversation}
            authorOdinId={authorOdinId}
            isGroupChat={isGroupChat}
            messageFromMe={messageFromMe}
            chatActions={chatActions}
          />
        ) : (
          <ChatTextMessageBody
            msg={msg}
            conversation={conversation}
            authorOdinId={authorOdinId}
            isGroupChat={isGroupChat}
            messageFromMe={messageFromMe}
            chatActions={chatActions}
            isDeleted={isDeleted}
          />
        )}
        {conversation ? <ChatReactionComposer msg={msg} conversation={conversation} /> : null}
      </div>
    </>
  );
};

const ChatReactions = ({
  msg,
  conversation,
}: {
  msg: DriveSearchResult<ChatMessage>;
  conversation: DriveSearchResult<Conversation> | undefined;
}) => {
  const { data: reactions } = useChatReaction({
    conversationId: conversation?.fileMetadata.appData.uniqueId,
    messageId: msg.fileMetadata.appData.uniqueId,
  }).get;

  const uniqueEmojis = reactions
    ?.map((reaction) => reaction.fileMetadata.appData.content.message)
    .slice(0, 5);
  const count = reactions?.length;

  if (!reactions?.length) return null;

  return (
    <div className="absolute -bottom-4 left-2 right-0 flex flex-row">
      <div className="flex cursor-pointer flex-row items-center gap-1 rounded-lg bg-background px-2 py-1 shadow-sm">
        {uniqueEmojis?.map((emoji) => <p key={emoji}>{emoji}</p>)}
        {count && uniqueEmojis && count > uniqueEmojis?.length ? (
          <p className="text-sm text-foreground/80">{count}</p>
        ) : null}
      </div>
    </div>
  );
};

const ChatTextMessageBody = ({
  msg,
  conversation,

  isGroupChat,
  messageFromMe,
  authorOdinId,
  chatActions,
  isDeleted,
}: {
  msg: DriveSearchResult<ChatMessage>;
  conversation?: DriveSearchResult<Conversation>;

  isGroupChat?: boolean;
  messageFromMe: boolean;
  authorOdinId: string;
  chatActions?: ChatActions;
  isDeleted: boolean;
}) => {
  const content = msg.fileMetadata.appData.content;
  const isEmojiOnly =
    (content.message?.match(/^\p{Extended_Pictographic}/u) &&
      !content.message?.match(/[0-9a-zA-Z]/)) ??
    false;
  const isReply = !!content.replyId;
  const showBackground = !isEmojiOnly || isReply;

  return (
    <div
      className={`relative w-auto max-w-[75vw] rounded-lg px-2 py-1 shadow-sm md:max-w-xs lg:max-w-lg ${
        showBackground
          ? messageFromMe
            ? 'bg-primary/10 dark:bg-primary/30'
            : 'bg-gray-500/10  dark:bg-gray-300/20'
          : ''
      }`}
    >
      {isGroupChat && !messageFromMe ? (
        <p className="font-semibold">
          <ConnectionName odinId={authorOdinId} />
        </p>
      ) : null}
      <div className="flex flex-col md:flex-row md:flex-wrap md:gap-2">
        {isDeleted ? (
          <MessageDeletedInnerBody />
        ) : (
          <div className="flex flex-col gap-1">
            {content.replyId ? <EmbeddedMessageWithId msgId={content.replyId} /> : null}
            <p className={`whitespace-pre-wrap ${isEmojiOnly && !isReply ? 'text-7xl' : ''}`}>
              {content.message}
            </p>
          </div>
        )}
        <div className="ml-auto mt-auto flex flex-shrink-0 flex-row-reverse gap-2">
          <ChatDeliveryIndicator msg={msg} />
          <ChatSentTimeIndicator msg={msg} />
        </div>
        {!isDeleted ? (
          <ContextMenu chatActions={chatActions} msg={msg} conversation={conversation} />
        ) : null}
      </div>
      <ChatReactions msg={msg} conversation={conversation} />
    </div>
  );
};

export const MessageDeletedInnerBody = () => {
  return (
    <div className="flex select-none flex-row items-center gap-2 text-foreground/50">
      <Block className="h-4 w-4" />
      <p>{t('This message was deleted')}</p>
    </div>
  );
};

const ChatMediaMessageBody = ({
  msg,
  conversation,

  isGroupChat,
  messageFromMe,

  authorOdinId,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;
  conversation?: DriveSearchResult<Conversation>;

  isGroupChat?: boolean;
  messageFromMe: boolean;

  authorOdinId: string;
  chatActions?: ChatActions;
}) => {
  const content = msg.fileMetadata.appData.content;

  const hasACaption = !!content.message;
  const ChatFooter = ({ className }: { className?: string }) => (
    <>
      <div className={`ml-2 mt-auto flex flex-row-reverse gap-2  ${className || ''}`}>
        <ChatDeliveryIndicator msg={msg} />
        <ChatSentTimeIndicator msg={msg} className={hasACaption ? undefined : 'invert'} />
      </div>
      <ContextMenu chatActions={chatActions} msg={msg} conversation={conversation} />
    </>
  );

  return (
    <div
      className={`relative w-auto max-w-[75vw] rounded-lg shadow-sm md:max-w-xs ${
        messageFromMe ? 'bg-primary/10 dark:bg-primary/30' : 'bg-gray-500/10  dark:bg-gray-300/20'
      }`}
    >
      {isGroupChat && !messageFromMe ? (
        <p className="font-semibold">
          <ConnectionName odinId={authorOdinId} />
        </p>
      ) : null}
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
      <ChatReactions msg={msg} conversation={conversation} />
    </div>
  );
};
