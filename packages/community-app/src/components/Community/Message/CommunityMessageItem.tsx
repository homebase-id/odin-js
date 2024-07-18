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
import {
  CommunityDeletedArchivalStaus,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityActions, ContextMenu } from '../channel/ContextMenu';
import { useParams } from 'react-router-dom';
import { CommunityDeliveryIndicator } from './CommunityDeliveryIndicator';
import { CommunitySentTimeIndicator } from './CommunitySentTimeIndicator';

export const CommunityMessageItem = ({
  msg,
  community,
  communityActions,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  communityActions?: CommunityActions;
}) => {
  const identity = useDotYouClient().getIdentity();
  const authorOdinId =
    msg.fileMetadata.senderOdinId || msg.fileMetadata.appData.content.authorOdinId || '';

  const messageFromMe = !authorOdinId || authorOdinId === identity;
  const hasMedia = !!msg.fileMetadata.payloads.length;

  const { chatMessageKey, mediaKey } = useParams();
  const isDetail = stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey) && mediaKey;

  const isDeleted = msg.fileMetadata.appData.archivalStatus === CommunityDeletedArchivalStaus;

  // const hasReactions = useChatReaction({
  //   messageId: msg.fileMetadata.appData.uniqueId,
  //   conversationId: conversation?.fileMetadata.appData.uniqueId,
  // }).get.data?.length;
  const hasReactions = false;

  return (
    <>
      {/* {isDetail ? <CommunityMediaGallery msg={msg} /> : null} */}
      <div
        className={`flex gap-2 ${messageFromMe ? 'flex-row-reverse' : 'flex-row'} group relative ${
          hasReactions ? 'pb-6' : ''
        }`}
        data-unique-id={msg.fileMetadata.appData.uniqueId}
      >
        {!messageFromMe ? (
          <ConnectionImage
            odinId={authorOdinId}
            className="border border-neutral-200 dark:border-neutral-800"
            size="sm"
          />
        ) : null}
        {hasMedia && !isDeleted ? (
          <CommunityMediaMessageBody
            msg={msg}
            community={community}
            authorOdinId={authorOdinId}
            messageFromMe={messageFromMe}
            communityActions={communityActions}
          />
        ) : (
          <CommunityTextMessageBody
            msg={msg}
            community={community}
            authorOdinId={authorOdinId}
            messageFromMe={messageFromMe}
            communityActions={communityActions}
            isDeleted={isDeleted}
          />
        )}
        {/* {conversation && !isDeleted ? (
          <CommunityReactionComposer msg={msg} conversation={conversation} />
        ) : null} */}
      </div>
    </>
  );
};

const CommunityTextMessageBody = ({
  msg,
  community,

  messageFromMe,
  authorOdinId,
  communityActions,
  isDeleted,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;

  messageFromMe: boolean;
  authorOdinId: string;
  communityActions?: CommunityActions;
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
      {!messageFromMe ? (
        <p className={`font-semibold`} style={{ color: getOdinIdColor(authorOdinId).darkTheme }}>
          <ConnectionName odinId={authorOdinId} />
        </p>
      ) : null}
      <div className="flex flex-col md:flex-row md:flex-wrap md:gap-2">
        {isDeleted ? (
          <MessageDeletedInnerBody />
        ) : (
          <div className="flex min-w-0 flex-col gap-1">
            {/* {content.replyId ? <EmbeddedMessageWithId msgId={content.replyId} /> : null} */}
            <ParagraphWithLinks
              text={content.message}
              className={`copyable-content whitespace-pre-wrap break-words ${
                isEmojiOnly && !isReply ? 'text-7xl' : ''
              }`}
            />
          </div>
        )}
        <div className="ml-auto mt-auto flex flex-shrink-0 flex-row-reverse gap-2">
          <CommunityDeliveryIndicator msg={msg} />
          <CommunitySentTimeIndicator msg={msg} />
        </div>
        {!isDeleted ? (
          <ContextMenu communityActions={communityActions} msg={msg} community={community} />
        ) : null}
      </div>
      {/* {!isDeleted ? <ChatReactions msg={msg} community={community} /> : null} */}
    </div>
  );
};

const urlAndMentionRegex = new RegExp(/(https?:\/\/[^\s]+|@[^\s]+)/);
const urlRegex = new RegExp(
  /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d{1,5})?)(\/[^\s]*)?/
);
const mentionRegex = new RegExp(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
const ParagraphWithLinks = ({ text, className }: { text: string; className?: string }) => {
  const splitUpText = text.split(urlAndMentionRegex);

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
              className="break-all text-primary underline"
            >
              {part}
            </a>
          );
        } else if (mentionRegex.test(part)) {
          return (
            <a
              key={index}
              href={`https://${part.slice(1)}`}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary underline"
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

const CommunityMediaMessageBody = ({
  msg,
  community,

  messageFromMe,

  authorOdinId,
  communityActions,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;

  messageFromMe: boolean;

  authorOdinId: string;
  communityActions?: CommunityActions;
}) => {
  const { isDarkMode } = useDarkMode();
  const content = msg.fileMetadata.appData.content;

  const hasACaption = !!content.message;
  const ChatFooter = ({ className }: { className?: string }) => (
    <>
      <div className={`ml-2 mt-auto flex flex-row-reverse gap-2 ${className || ''}`}>
        <CommunityDeliveryIndicator msg={msg} />
        <CommunitySentTimeIndicator
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
      <ContextMenu communityActions={communityActions} msg={msg} community={community} />
    </>
  );

  return (
    <div
      className={`relative w-full max-w-[75vw] rounded-lg shadow-sm md:max-w-xs lg:max-w-xl ${
        messageFromMe ? 'bg-primary/10 dark:bg-primary/30' : 'bg-gray-500/10 dark:bg-gray-300/20'
      }`}
    >
      {!messageFromMe ? (
        <p
          className={`px-2 py-[0.4rem] font-semibold`}
          style={{ color: getOdinIdColor(authorOdinId).darkTheme }}
        >
          <ConnectionName odinId={authorOdinId} />
        </p>
      ) : null}
      <div className="relative">
        {/* {content.replyId ? (
          <EmbeddedMessageWithId msgId={content.replyId} className="mb-4" />
        ) : null} */}
        {/* <ChatMedia msg={msg} /> */}
        {!hasACaption ? <ChatFooter className="absolute bottom-0 right-0 px-2 py-1" /> : null}
      </div>
      {hasACaption ? (
        <div className="flex min-w-0 flex-col px-2 py-2 md:flex-row md:justify-between">
          <ParagraphWithLinks
            text={content.message}
            className={`whitespace-pre-wrap break-words`}
          />
          <ChatFooter />
        </div>
      ) : null}
      {/* <ChatReactions msg={msg} community={community} /> */}
    </div>
  );
};
