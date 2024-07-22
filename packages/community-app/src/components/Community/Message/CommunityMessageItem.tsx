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
  ActionLink,
  formatToTimeAgoWithRelativeDetail,
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
import { CommunityMedia } from './CommunityMedia';
import { CommunityMediaGallery } from './detail/CommunityMediaGallery';
import { useEffect, useMemo, useState } from 'react';
import { useCommunityMessages } from '../../../hooks/community/messages/useCommunityMessages';
import { COMMUNITY_ROOT } from '../../../templates/Community/CommunityHome';

export const CommunityMessageItem = ({
  msg,
  community,
  communityActions,
  hideDetails,
  hideThreads,
  className,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  communityActions?: CommunityActions;
  hideDetails?: boolean;
  hideThreads?: boolean;
  className?: string;
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
  const isDetail = stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey);
  const isMediaDetail =
    stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey) && mediaKey;

  const isDeleted = msg.fileMetadata.appData.archivalStatus === CommunityDeletedArchivalStaus;

  // const hasReactions = useChatReaction({
  //   messageId: msg.fileMetadata.appData.uniqueId,
  //   conversationId: conversation?.fileMetadata.appData.uniqueId,
  // }).get.data?.length;
  const hasReactions = false;

  const [highlight, setHighlight] = useState(isDetail);
  useEffect(() => {
    if (!highlight) return;
    setTimeout(() => {
      setHighlight(false);
    }, 5000);
  }, [highlight]);

  return (
    <>
      {isMediaDetail ? (
        <CommunityMediaGallery
          msg={msg}
          communityId={community?.fileMetadata.appData.uniqueId as string}
        />
      ) : null}
      <div
        className={`group relative flex flex-row gap-2 bg-background transition-colors duration-500 ${isDetail ? (highlight ? 'bg-primary/20 duration-1000' : 'bg-page-background duration-1000') : 'hover:bg-page-background'} ${hasReactions ? 'pb-6' : ''} ${className || ''}`}
        data-unique-id={msg.fileMetadata.appData.uniqueId}
      >
        {hideDetails ? (
          <div className="w-8"></div>
        ) : (
          <>
            {!messageFromMe ? (
              <ConnectionImage
                odinId={authorOdinId}
                className={`flex-shrink-0 border border-neutral-200 dark:border-neutral-800`}
                size="xs"
              />
            ) : (
              <OwnerImage
                className={`flex-shrink-0 border border-neutral-200 dark:border-neutral-800`}
                size="xs"
              />
            )}
          </>
        )}

        <div className="flex w-20 flex-grow flex-col">
          <div className="flex flex-row items-center gap-2">
            {hideDetails ? null : (
              <>
                <p
                  className={`font-semibold`}
                  style={{ color: getOdinIdColor(authorOdinId).darkTheme }}
                >
                  {messageFromMe ? <OwnerName /> : <ConnectionName odinId={authorOdinId} />}
                </p>
                <CommunitySentTimeIndicator className="text-sm" msg={msg} />
                <CommunityDeliveryIndicator msg={msg} />
              </>
            )}
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
          {hideThreads ? null : <CommunityMessageThreadSummary community={community} msg={msg} />}
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
  if (!text) return null;
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
      <CommunityMedia msg={msg} communityId={community?.fileMetadata.appData.uniqueId as string} />

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

const CommunityMessageThreadSummary = ({
  community,
  msg,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  msg: HomebaseFile<CommunityMessage>;
}) => {
  const { communityKey, channelKey } = useParams();

  const { data: messages } = useCommunityMessages({
    communityId: community?.fileMetadata.appData.uniqueId as string,
    originId: msg.fileMetadata.appData.uniqueId,
  }).all;

  const flattenedMsgs =
    useMemo(
      () =>
        (messages?.pages?.flatMap((page) => page?.searchResults)?.filter(Boolean) ||
          []) as HomebaseFile<CommunityMessage>[],
      [messages]
    ) || [];

  if (!flattenedMsgs?.length) return null;

  return (
    <ActionLink
      className="flex flex-row gap-2 text-indigo-500"
      href={`${COMMUNITY_ROOT}/${communityKey}/${channelKey}/thread/${msg.fileMetadata.appData.uniqueId}`}
      type="mute"
    >
      <p className="text-sm font-semibold">
        {flattenedMsgs.length} {t('replies')}
        <span className="ml-1 font-normal text-foreground/50">
          {t('Last reply')}{' '}
          {formatToTimeAgoWithRelativeDetail(new Date(flattenedMsgs?.[0].fileMetadata.created))}
        </span>
      </p>
    </ActionLink>
  );
};
