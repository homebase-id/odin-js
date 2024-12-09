import {
  ConnectionImage,
  ConnectionName,
  t,
  getOdinIdColor,
  OwnerImage,
  OwnerName,
  formatToTimeAgoWithRelativeDetail,
  AuthorImage,
  getTextRootsRecursive,
  RichTextRenderer,
  COMMUNITY_ROOT_PATH,
  useDotYouClientContext,
  ActionButton,
} from '@homebase-id/common-app';
import { HomebaseFile, RichText } from '@homebase-id/js-lib/core';
import {
  formatGuidId,
  isTouchDevice,
  stringGuidsEqual,
  toGuidId,
} from '@homebase-id/js-lib/helpers';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityActions, ContextMenu } from '../channel/ContextMenu';
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom';
import { CommunityDeliveryIndicator } from './CommunityDeliveryIndicator';
import { CommunitySentTimeIndicator } from './CommunitySentTimeIndicator';
import { CommunityMedia } from './CommunityMedia';
import { CommunityMediaGallery } from './detail/CommunityMediaGallery';
import { memo, useEffect, useMemo, useState } from 'react';
import { useCommunityMessages } from '../../../hooks/community/messages/useCommunityMessages';
import { useCommunityChannels } from '../../../hooks/community/channels/useCommunityChannels';
import { CommunityReactions } from './reactions/CommunityReactions';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { CommunityMessageEditor } from './detail/CommunityMessageEditor';

export const CommunityMessageItem = memo(
  (props: {
    msg: HomebaseFile<CommunityMessage>;
    community?: HomebaseFile<CommunityDefinition>;
    communityActions?: CommunityActions;
    hideDetails?: boolean;
    hideThreads?: boolean;
    showChannelName?: boolean;
    className?: string;
  }) => {
    const {
      msg,
      community,
      communityActions,
      hideDetails,
      hideThreads,
      showChannelName,
      className,
    } = props;

    const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
    const authorOdinId = msg.fileMetadata.originalAuthor || loggedOnIdentity || '';

    const messageFromMe = !authorOdinId || authorOdinId === loggedOnIdentity;
    const hasMedia = !!msg.fileMetadata.payloads?.length;

    const { chatMessageKey, mediaKey, channelKey, threadKey } = useParams();
    const isDetail = stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey);
    const isMediaDetail = isDetail && mediaKey;

    const { data: channel } = useCommunityChannel({
      communityId: community?.fileMetadata.appData.uniqueId,
      channelId: msg.fileMetadata.appData.content.channelId,
    }).fetch;

    const [highlight, setHighlight] = useState(isDetail);
    useEffect(() => {
      if (!highlight) return;
      setTimeout(() => {
        setHighlight(false);
      }, 5000);
    }, [highlight]);

    const editMatch = useMatch(
      `${COMMUNITY_ROOT_PATH}/:odinKey/:communityKey/:channelKey/:chatMessageKey/edit`
    );
    const editInThreadMatch = useMatch(
      `${COMMUNITY_ROOT_PATH}/:odinKey/:communityKey/:channelKey/:threadKey/thread/:chatMessageKey/edit`
    );
    const isEdit = !!isDetail && !!(editMatch || editInThreadMatch);

    const navigate = useNavigate();
    const extendedCommunityActions: CommunityActions | undefined = useMemo(() => {
      if (!communityActions || !channelKey) return undefined;
      return {
        ...communityActions,
        doEdit: () =>
          navigate(
            `${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${community?.fileMetadata.appData.uniqueId}/${channelKey}/${threadKey ? `${threadKey}/thread/` : ``}${msg.fileMetadata.appData.uniqueId}/edit`
          ),
      };
    }, []);

    return (
      <>
        {isMediaDetail ? (
          <CommunityMediaGallery
            odinId={community?.fileMetadata.senderOdinId as string}
            msg={msg}
            communityId={community?.fileMetadata.appData.uniqueId as string}
          />
        ) : null}
        <div
          className={`group relative flex flex-col transition-colors duration-500 ${isEdit ? 'bg-primary/20' : `bg-background ${isDetail ? (highlight ? 'bg-primary/20 duration-1000' : 'bg-page-background duration-1000') : !isTouchDevice() ? 'hover:bg-page-background' : ''}`} ${className || ''}`}
          data-unique-id={msg.fileMetadata.appData.uniqueId}
        >
          {showChannelName && !hideDetails ? (
            <Link
              className="mb-1 text-primary hover:underline"
              to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${community?.fileMetadata.appData.uniqueId}/${msg.fileMetadata.appData.content.channelId}`}
            >
              #{channel?.fileMetadata.appData.content.title}
            </Link>
          ) : null}
          <div className="flex flex-row gap-2">
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

                <ContextMenu
                  communityActions={extendedCommunityActions}
                  msg={msg}
                  community={community}
                />
              </div>

              {isEdit && community ? (
                <CommunityMessageEditor
                  msg={msg}
                  community={community}
                  onClose={() => navigate(window.location.pathname.replace(/\/edit$/, ''))}
                />
              ) : (
                <>
                  {hasMedia ? (
                    <CommunityMediaMessageBody msg={msg} community={community} />
                  ) : (
                    <CommunityTextMessageBody msg={msg} community={community} />
                  )}
                </>
              )}
              {hideThreads || !msg.fileMetadata.reactionPreview?.totalCommentCount ? null : (
                <CommunityMessageThreadSummary community={community} msg={msg} />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
);
CommunityMessageItem.displayName = 'CommunityMessageItem';

const CommunityTextMessageBody = ({
  msg,
  community,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const content = msg.fileMetadata.appData.content;
  const plainText = getTextRootsRecursive(content.message).join(' ');
  const isEmojiOnly =
    (plainText?.match(/^\p{Extended_Pictographic}/u) && !plainText?.match(/[0-9a-zA-Z]/)) ?? false;
  const isReply = !!content.replyId;

  return (
    <div className={`relative w-auto rounded-lg`}>
      <div className="flex flex-col md:flex-row md:flex-wrap md:gap-2">
        <div className="flex w-full min-w-0 flex-col gap-1">
          <MessageTextRenderer
            community={community}
            message={content.message}
            className={`copyable-content whitespace-pre-wrap break-words ${
              isEmojiOnly && !isReply ? 'text-7xl' : ''
            }`}
          />
        </div>
      </div>
      <CommunityReactions msg={msg} community={community} />
    </div>
  );
};

const MessageTextRenderer = ({
  community,
  message,
  className,
}: {
  community?: HomebaseFile<CommunityDefinition>;
  message: RichText | string;
  className?: string;
}) => {
  const { data: channels } = useCommunityChannels({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
  }).fetch;

  if (!message) return null;
  return (
    <RichTextRenderer
      body={message}
      className={className}
      renderElement={(element, children) => {
        const { type, attributes } = element;

        if (type === 'p' || type === 'paragraph') {
          return (
            <p {...attributes} className="min-h-2">
              {children}
            </p>
          );
        }

        if (
          type === 'channel' &&
          attributes &&
          'value' in attributes &&
          typeof attributes.value === 'string'
        ) {
          const tagGuid = formatGuidId(toGuidId(attributes.value));

          const hasChannel = !!channels?.find((channel) =>
            stringGuidsEqual(channel.fileMetadata.appData.uniqueId, tagGuid)
          );

          if (hasChannel) {
            return (
              <Link
                to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${community?.fileMetadata.appData.uniqueId}/${tagGuid}`}
                className="break-all text-primary hover:underline"
              >
                #{attributes.value.trim()}{' '}
              </Link>
            );
          } else {
            return <span className="break-all text-primary">#{attributes.value} </span>;
          }
        }

        if (
          type === 'mention' &&
          attributes &&
          'value' in attributes &&
          typeof attributes.value === 'string'
        ) {
          const domainRegex =
            /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;

          if (domainRegex.test(attributes.value))
            return (
              <a
                href={`https://${attributes.value}`}
                target="_blank"
                rel="noreferrer noopener"
                className="break-words text-primary hover:underline"
              >
                @{attributes.value.replaceAll('@', '')}
              </a>
            );
          else
            return (
              <span className="break-all text-primary">
                @{attributes.value.replaceAll('@', '')}
              </span>
            );
        }

        return null;
      }}
    />
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
    <div className={`relative w-full max-w-[75vw] rounded-lg md:max-w-[90%]`}>
      {hasACaption ? (
        <MessageTextRenderer
          community={community}
          message={content.message}
          className={`whitespace-pre-wrap break-words`}
        />
      ) : null}
      <CommunityMedia
        msg={msg}
        communityId={community?.fileMetadata.appData.uniqueId as string}
        odinId={community?.fileMetadata.senderOdinId as string}
      />
      <CommunityReactions msg={msg} community={community} />
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
  const { odinKey, communityKey, channelKey } = useParams();

  const {
    data: messages,
    isFetching,
    isRefetching,
    refetch,
  } = useCommunityMessages({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId as string,
    threadId: msg.fileMetadata.globalTransitId,
  }).all;

  const { flattenedMsgs, uniqueSenders } = useMemo(() => {
    const flattenedMsgs = (messages?.pages
      ?.flatMap((page) => page?.searchResults)
      ?.filter(Boolean) || []) as HomebaseFile<CommunityMessage>[];

    const uniqueSenders = Array.from(
      new Set(flattenedMsgs.map((msg) => msg.fileMetadata.originalAuthor?.trim()))
    ).filter(Boolean);

    return { flattenedMsgs, uniqueSenders };
  }, [messages]);

  if (!flattenedMsgs?.length) {
    if (isFetching && !isRefetching) return null;
    return (
      <div className="rounded-md border bg-slate-100 p-2 dark:bg-slate-700">
        <p className="text-lg">{t('Bad data!')}</p>
        <p>
          {t("The message says there are replies, but we didn't find any")}{' '}
          <ActionButton
            type="secondary"
            state={isRefetching ? 'loading' : undefined}
            onClick={() => refetch()}
          >
            {t('Force fetch')}
          </ActionButton>
        </p>
      </div>
    );
  }

  return (
    <Link
      className="mr-auto flex w-full max-w-xs flex-row items-center gap-2 rounded-lg px-1 py-1 text-indigo-500 transition-colors hover:bg-background hover:shadow-sm"
      to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || 'all'}/${msg.fileMetadata.appData.uniqueId}/thread`}
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
