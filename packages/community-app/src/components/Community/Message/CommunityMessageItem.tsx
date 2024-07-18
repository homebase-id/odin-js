import {
  useDotYouClient,
  ConnectionImage,
  ConnectionName,
  Block,
  t,
  getOdinIdColor,
  useDarkMode,
  OwnerImage,
  OwnerName,
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
    msg.fileMetadata.senderOdinId ||
    msg.fileMetadata.appData.content.authorOdinId ||
    identity ||
    '';

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
        className={`group relative flex flex-row gap-2 ${hasReactions ? 'pb-6' : ''}`}
        data-unique-id={msg.fileMetadata.appData.uniqueId}
      >
        {!messageFromMe ? (
          <ConnectionImage
            odinId={authorOdinId}
            className="border border-neutral-200 dark:border-neutral-800"
            size="xs"
          />
        ) : (
          <OwnerImage className="border border-neutral-200 dark:border-neutral-800" size="xs" />
        )}

        <div className="flex flex-col">
          <div className="flex flex-row items-center gap-2">
            <p
              className={`font-semibold`}
              style={{ color: getOdinIdColor(authorOdinId).darkTheme }}
            >
              {messageFromMe ? <OwnerName /> : <ConnectionName odinId={authorOdinId} />}
            </p>
            <CommunitySentTimeIndicator className="text-sm" msg={msg} />
            <CommunityDeliveryIndicator msg={msg} />
            {!isDeleted ? (
              <ContextMenu communityActions={communityActions} msg={msg} community={community} />
            ) : null}
          </div>

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

  return (
    <div
      className={`relative w-auto max-w-[75vw] rounded-lg md:max-w-xs lg:max-w-lg xl:max-w-[50vw]`}
    >
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

  return (
    <div className={`relative w-full max-w-[75vw] rounded-lg md:max-w-xs lg:max-w-xl`}>
      {/* <ChatMedia msg={msg} /> */}

      {hasACaption ? (
        <div className="flex min-w-0 flex-col md:flex-row md:justify-between">
          <ParagraphWithLinks
            text={content.message}
            className={`whitespace-pre-wrap break-words`}
          />
        </div>
      ) : null}
      {/* <ChatReactions msg={msg} community={community} /> */}
    </div>
  );
};
