import {
  useDotYouClient,
  ConnectionImage,
  ConnectionName,
  Block,
  t,
  getOdinIdColor,
  useDarkMode,
} from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ChatMessage, ChatDeletedArchivalStaus } from '../../../providers/ChatProvider';
import { UnifiedConversation } from '../../../providers/ConversationProvider';
import { ChatMedia } from './Media/ChatMedia';
import { ChatMediaGallery } from './Media/ChatMediaGallery';
import { ChatDeliveryIndicator } from './ChatDeliveryIndicator';
import { ChatSentTimeIndicator } from './ChatSentTimeIndicator';
import { ChatActions, ContextMenu } from './ContextMenu';
import { EmbeddedMessageWithId } from './EmbeddedMessage';
import { useParams } from 'react-router-dom';
import { ChatReactionComposer } from '../Composer/ChatReactionComposer';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';
import { ChatReactions } from './ChatReactions';

export const ChatMessageItem = ({
  msg,
  conversation,
  chatActions,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation?: HomebaseFile<UnifiedConversation>;
  chatActions?: ChatActions;
}) => {
  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;
  const hasMedia = !!msg.fileMetadata.payloads?.length;

  const { chatMessageKey, mediaKey } = useParams();
  const isDetail = stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey) && mediaKey;

  const isDeleted = msg.fileMetadata.appData.archivalStatus === ChatDeletedArchivalStaus;
  const isGroupChat =
    (
      conversation?.fileMetadata.appData.content?.recipients?.filter(
        (recipient) => recipient !== identity
      ) || []
    )?.length > 1;

  const hasReactions = useChatReaction({
    messageId: msg.fileMetadata.appData.uniqueId,
    conversationId: conversation?.fileMetadata.appData.uniqueId,
  }).get.data?.length;

  return (
    <>
      {isDetail ? <ChatMediaGallery msg={msg} /> : null}
      <div
        className={`flex gap-2 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} group relative ${
          hasReactions ? 'pb-6' : ''
        }`}
        data-unique-id={msg.fileMetadata.appData.uniqueId}
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
        {conversation && !isDeleted ? (
          <ChatReactionComposer msg={msg} conversation={conversation} />
        ) : null}
      </div>
    </>
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
  msg: HomebaseFile<ChatMessage>;
  conversation?: HomebaseFile<UnifiedConversation>;

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
      className={`relative w-auto max-w-[75vw] rounded-lg px-2 py-[0.4rem] ${
        isEmojiOnly ? '' : 'shadow-sm'
      } md:max-w-xs lg:max-w-lg xl:max-w-[50vw] ${
        showBackground
          ? messageFromMe
            ? 'bg-primary/10 dark:bg-primary/30'
            : 'bg-gray-500/10  dark:bg-gray-300/20'
          : ''
      }`}
    >
      {isGroupChat && !messageFromMe ? (
        <p className={`font-semibold`} style={{ color: getOdinIdColor(authorOdinId).darkTheme }}>
          <ConnectionName odinId={authorOdinId} />
        </p>
      ) : null}
      <div className="flex flex-col md:flex-row md:flex-wrap md:gap-2">
        {isDeleted ? (
          <MessageDeletedInnerBody />
        ) : (
          <div className="flex min-w-0 flex-col gap-1">
            {content.replyId ? <EmbeddedMessageWithId msgId={content.replyId} /> : null}
            <ParagraphWithLinks
              text={content.message}
              className={`whitespace-pre-wrap break-words ${
                isEmojiOnly && !isReply ? 'text-7xl' : ''
              }`}
            />
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
      {!isDeleted ? <ChatReactions msg={msg} conversation={conversation} /> : null}
    </div>
  );
};

const urlRegex = new RegExp(/(https?:\/\/[^\s]+)/);
const ParagraphWithLinks = ({ text, className }: { text: string; className?: string }) => {
  const splitUpText = text.split(urlRegex);

  return (
    <p className={className}>
      {splitUpText.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
};

export const MessageDeletedInnerBody = () => {
  return (
    <div className="flex select-none flex-row items-center gap-2 text-foreground/50">
      <Block className="h-5 w-5" />
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
  msg: HomebaseFile<ChatMessage>;
  conversation?: HomebaseFile<UnifiedConversation>;

  isGroupChat?: boolean;
  messageFromMe: boolean;

  authorOdinId: string;
  chatActions?: ChatActions;
}) => {
  const { isDarkMode } = useDarkMode();
  const content = msg.fileMetadata.appData.content;

  const hasACaption = !!content.message;
  const ChatFooter = ({ className }: { className?: string }) => (
    <>
      <div className={`ml-2 mt-auto flex flex-row-reverse gap-2 ${className || ''}`}>
        <ChatDeliveryIndicator msg={msg} />
        <ChatSentTimeIndicator
          msg={msg}
          className={`dark:text-white/70 ${
            !hasACaption &&
            !isDarkMode &&
            msg.fileMetadata.payloads.some(
              (payload) =>
                payload.contentType.includes('image/') || payload.contentType.includes('video/')
            )
              ? 'invert'
              : ''
          }`}
        />
      </div>
      <ContextMenu chatActions={chatActions} msg={msg} conversation={conversation} />
    </>
  );

  return (
    <div
      className={`relative w-full max-w-[75vw] rounded-lg shadow-sm md:max-w-xs ${
        messageFromMe ? 'bg-primary/10 dark:bg-primary/30' : 'bg-gray-500/10 dark:bg-gray-300/20'
      }`}
    >
      {isGroupChat && !messageFromMe ? (
        <p className={`font-semibold`} style={{ color: getOdinIdColor(authorOdinId).darkTheme }}>
          <ConnectionName odinId={authorOdinId} />
        </p>
      ) : null}
      <div className="relative">
        {content.replyId ? (
          <EmbeddedMessageWithId msgId={content.replyId} className="mb-4" />
        ) : null}
        <ChatMedia msg={msg} />
        {!hasACaption ? <ChatFooter className="absolute bottom-0 right-0 px-2 py-1" /> : null}
      </div>
      {hasACaption ? (
        <div className="flex min-w-0 flex-col px-2 py-2 md:flex-row md:justify-between">
          <p className="whitespace-pre-wrap break-words">{content.message}</p>
          <ChatFooter />
        </div>
      ) : null}
      <ChatReactions msg={msg} conversation={conversation} />
    </div>
  );
};
