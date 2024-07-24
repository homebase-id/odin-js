import {
  useDotYouClient,
  ConnectionImage,
  ConnectionName,
  t,
  getOdinIdColor,
  OwnerImage,
  OwnerName,
  formatToTimeAgoWithRelativeDetail,
  AuthorImage,
} from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { formatGuidId, stringGuidsEqual, toGuidId } from '@youfoundation/js-lib/helpers';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityActions, ContextMenu } from '../channel/ContextMenu';
import { Link, useParams } from 'react-router-dom';
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
        className={`group relative flex flex-row gap-2 bg-background transition-colors duration-500 ${isDetail ? (highlight ? 'bg-primary/20 duration-1000' : 'bg-page-background duration-1000') : 'hover:bg-page-background'} ${className || ''}`}
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

            <ContextMenu communityActions={communityActions} msg={msg} community={community} />
          </div>

          {hasMedia ? (
            <CommunityMediaMessageBody msg={msg} community={community} />
          ) : (
            <CommunityTextMessageBody msg={msg} community={community} />
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
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
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
        <div className="flex min-w-0 flex-col gap-1">
          {/* {content.replyId ? <EmbeddedMessageWithId msgId={content.replyId} /> : null} */}
          <ParagraphWithLinks
            text={content.message}
            className={`copyable-content whitespace-pre-wrap break-words ${
              isEmojiOnly && !isReply ? 'text-7xl' : ''
            }`}
          />
        </div>
      </div>
      {/* {!isDeleted ? <ChatReactions msg={msg} community={community} /> : null} */}
    </div>
  );
};

const urlAndMentionRegex = new RegExp(/(https?:\/\/[^\s]+|@[^\s]+|#[^\s]+)/);
const urlRegex = new RegExp(
  /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d{1,5})?)(\/[^\s]*)?/
);
const mentionRegex = new RegExp(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
const tagRegex = new RegExp(/#[a-zA-Z0-9.-]/);
const ParagraphWithLinks = ({ text, className }: { text: string; className?: string }) => {
  if (!text) return null;
  const splitUpText = text.split(urlAndMentionRegex);
  const { communityKey } = useParams();

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
        } else if (tagRegex.test(part)) {
          const tag = part.slice(1);
          const tagGuid = formatGuidId(toGuidId(tag));
          return (
            <Link
              key={index}
              to={`${COMMUNITY_ROOT}/${communityKey}/${tagGuid}`}
              className="break-all text-primary hover:underline"
            >
              {part}
            </Link>
          );
        }
        return part;
      })}
    </p>
  );
};

const CommunityMediaMessageBody = ({
  msg,
  community,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
}) => {
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

  const { flattenedMsgs, uniqueSenders } = useMemo(() => {
    const flattenedMsgs = (messages?.pages
      ?.flatMap((page) => page?.searchResults)
      ?.filter(Boolean) || []) as HomebaseFile<CommunityMessage>[];

    const uniqueSenders = Array.from(
      new Set(flattenedMsgs.map((msg) => msg.fileMetadata.senderOdinId))
    );

    return { flattenedMsgs, uniqueSenders };
  }, [messages]);

  if (!flattenedMsgs?.length) return null;

  return (
    <Link
      className="mr-auto flex w-full max-w-xs flex-row items-center gap-2 rounded-lg px-1 py-1 text-indigo-500 transition-colors hover:bg-background hover:shadow-sm"
      to={`${COMMUNITY_ROOT}/${communityKey}/${channelKey || 'all'}/${msg.fileMetadata.appData.uniqueId}/thread`}
    >
      {uniqueSenders.map((sender) => (
        <AuthorImage odinId={sender} key={sender} className="h-7 w-7" excludeLink={true} />
      ))}
      <p className="text-sm font-semibold">
        {flattenedMsgs.length} {t(flattenedMsgs.length === 1 ? 'reply' : 'replies')}
        <span className="ml-2 font-normal text-foreground/50">
          {t('Last reply')}{' '}
          {formatToTimeAgoWithRelativeDetail(new Date(flattenedMsgs?.[0].fileMetadata.created))}
        </span>
      </p>
    </Link>
  );
};
