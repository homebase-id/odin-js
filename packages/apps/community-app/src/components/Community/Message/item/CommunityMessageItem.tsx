import {
  t,
  formatToTimeAgoWithRelativeDetail,
  AuthorImage,
  RichTextRenderer,
  COMMUNITY_ROOT_PATH,
  ActionButton,
  useContentFromPayload,
  useLongPress,
  ConnectionName,
  getPlainTextFromRichText,
} from '@homebase-id/common-app';
import { DEFAULT_PAYLOAD_KEY, HomebaseFile, RichText } from '@homebase-id/js-lib/core';
import {
  formatGuidId,
  isTouchDevice,
  stringGuidsEqual,
  toGuidId,
} from '@homebase-id/js-lib/helpers';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import {
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../../../providers/CommunityDefinitionProvider';
import { CommunityActions, ContextMenu } from '../../channel/ContextMenu';
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom';
import { CommunityDeliveryIndicator } from './CommunityDeliveryIndicator';
import { CommunitySentTimeIndicator } from './CommunitySentTimeIndicator';
import { CommunityMedia } from './CommunityMedia';
import { CommunityMediaGallery } from '../detail/CommunityMediaGallery';
import { memo, useEffect, useMemo, useState } from 'react';
import { useCommunityMessages } from '../../../../hooks/community/messages/useCommunityMessages';
import { useCommunityChannels } from '../../../../hooks/community/channels/useCommunityChannels';
import { CommunityReactions } from '../reactions/CommunityReactions';
import { useCommunityChannel } from '../../../../hooks/community/channels/useCommunityChannel';
import { CommunityMessageEditor } from '../detail/CommunityMessageEditor';
import { useCommunityLater } from '../../../../hooks/community/useCommunityLater';
import { BookmarkSolid, Persons, Pin } from '@homebase-id/common-app/icons';
import { useCommunityPin } from '../../../../hooks/community/useCommunityPin';
import { useCommunityCollaborativeMsg } from '../../../../hooks/community/useCommunityCollaborativeMsg';
import { CommunityMessageAuthorName } from './CommunityMesageAuthorName';
import { CommunityMessageAvatar } from './CommunityMessageAvatar';

export const CommunityMessageItem = memo(
  (props: {
    msg: HomebaseFile<CommunityMessage>;
    community?: HomebaseFile<CommunityDefinition>;
    communityActions?: CommunityActions;
    hideDetails?: boolean;
    hideThreads?: boolean;
    originId?: string;
    showChannelName?: boolean;
    className?: string;
    scrollRef?: React.RefObject<HTMLDivElement>;
  }) => {
    const {
      msg,
      community,
      communityActions,
      hideDetails,
      hideThreads,
      originId,
      showChannelName,
      className,
      scrollRef,
    } = props;

    const hasMedia = !!msg.fileMetadata.payloads?.filter((pyld) => pyld.key !== DEFAULT_PAYLOAD_KEY)
      ?.length;

    const { chatMessageKey, mediaKey } = useParams();
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
    const isEditPath = useMemo(
      () => !!isDetail && ((!!editMatch && !hideThreads) || (!!editInThreadMatch && hideThreads)),
      [editMatch, editInThreadMatch]
    );

    const [isEdit, setIsLocalEdit] = useState(isEditPath);
    useEffect(() => {
      setIsLocalEdit(isEditPath);
    }, [isEditPath]);

    const navigate = useNavigate();
    const extendedCommunityActions: CommunityActions | undefined = useMemo(() => {
      if (!communityActions) return undefined;
      return {
        ...communityActions,
        doEdit: () => setIsLocalEdit(true),
      };
    }, []);

    const { isSaved } = useCommunityLater({
      messageId: msg.fileMetadata.appData.uniqueId,
      systemFileType: msg.fileSystemType,
    });
    const { isPinned } = useCommunityPin({ msg, community });
    const { isCollaborative } = useCommunityCollaborativeMsg({ msg, community });

    const [isTouchContextMenuOpen, setIsTouchContextMenuOpen] = useState(false);
    const backgroundClassName = (() => {
      if (isSaved) return 'bg-primary/10';
      if (isPinned) return 'bg-orange-500/15';
      if (isEdit) return 'bg-primary/20';
      if (isDetail)
        return highlight ? 'bg-primary/20 duration-1000' : 'bg-page-background duration-1000';

      return `bg-background ${!isTouchDevice() ? 'hover:bg-page-background' : ''}`;
    })();

    const clickProps = useLongPress(
      (e) => {
        if (!(isTouchDevice() && window.innerWidth < 1024)) return;

        e.preventDefault();
        setIsTouchContextMenuOpen(true);
      },
      undefined,
      { shouldPreventDefault: false },
      scrollRef
    );

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
          className={`group relative flex select-none flex-col transition-colors duration-500 md:select-auto ${backgroundClassName} ${className || ''}`}
          data-unique-id={msg.fileMetadata.appData.uniqueId}
          {...clickProps}
        >
          {showChannelName && !hideDetails ? (
            <Link
              className="mb-1 text-primary hover:underline"
              to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${community?.fileMetadata.appData.uniqueId}/${msg.fileMetadata.appData.content.channelId}`}
            >
              #{channel?.fileMetadata.appData.content.title}
            </Link>
          ) : null}
          {isSaved ? (
            <div className="flex flex-row items-center gap-1 py-1 font-semibold text-primary">
              <BookmarkSolid className="h-3 w-3" />
              <p className="text-sm">{t('Saved for later')}</p>
            </div>
          ) : null}
          {isPinned ? (
            <div className="flex flex-row items-center gap-1 py-1 font-semibold text-orange-600">
              <Pin className="h-3 w-3" />
              <p className="text-sm">{t('Pinned')}</p>
            </div>
          ) : null}
          {isCollaborative ? (
            <div className="flex flex-row items-center gap-1 py-1 font-semibold text-green-600">
              <Persons className="h-3 w-3" />
              <p className="text-sm">{t('Collaborative')}</p>
            </div>
          ) : null}
          <div className="flex flex-row gap-2">
            {hideDetails && !isCollaborative ? (
              <div className="w-8"></div>
            ) : (
              <CommunityMessageAvatar msg={msg} />
            )}

            <div className="flex w-20 flex-grow flex-col">
              <div className="flex flex-row items-center gap-2">
                {hideDetails && !isCollaborative ? null : (
                  <>
                    <CommunityMessageAuthorName msg={msg} />
                    <CommunitySentTimeIndicator className="text-sm" msg={msg} />
                    <CommunityDeliveryIndicator msg={msg} />
                  </>
                )}

                <ContextMenu
                  communityActions={extendedCommunityActions}
                  msg={msg}
                  community={community}
                  isTouchOpen={isTouchContextMenuOpen}
                  setIsTouchOpen={setIsTouchContextMenuOpen}
                />
              </div>

              {isEdit && community ? (
                <CommunityMessageEditor
                  msg={msg}
                  community={community}
                  onClose={() => {
                    if (isEditPath) navigate(window.location.pathname.replace(/\/edit$/, ''));
                    else setIsLocalEdit(false);
                  }}
                />
              ) : (
                <>
                  {hasMedia ? (
                    <CommunityMediaMessageBody
                      msg={msg}
                      community={community}
                      scrollRef={scrollRef}
                      originId={originId}
                    />
                  ) : (
                    <CommunityTextMessageBody
                      msg={msg}
                      community={community}
                      scrollRef={scrollRef}
                    />
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
  scrollRef,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  scrollRef?: React.RefObject<HTMLDivElement>;
}) => {
  const [loadMore, setLoadMore] = useState(false);

  const content = msg.fileMetadata.appData.content;
  const plainText = getPlainTextFromRichText(content.message);
  const isEmojiOnly =
    (plainText?.match(/^\p{Extended_Pictographic}/u) && !plainText?.match(/[0-9a-zA-Z]/)) ?? false;

  const hasMoreContent = msg.fileMetadata.payloads?.some(
    (payload) => payload.key === DEFAULT_PAYLOAD_KEY
  );

  const { data: fullContent } = useContentFromPayload<CommunityMessage>(
    hasMoreContent && loadMore && community
      ? {
          odinId: community?.fileMetadata.senderOdinId,
          targetDrive: getTargetDriveFromCommunityId(
            community.fileMetadata.appData.uniqueId as string
          ),
          fileId: msg.fileId,
          payloadKey: DEFAULT_PAYLOAD_KEY,
          lastModified: msg.fileMetadata.payloads?.find((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)
            ?.lastModified,
          systemFileType: msg.fileSystemType,
        }
      : undefined
  );

  return (
    <div className={`relative w-auto rounded-lg`}>
      <div className="flex flex-col md:flex-row md:flex-wrap md:gap-2">
        <div className="flex w-full min-w-0 flex-col gap-1">
          <MessageTextRenderer
            community={community}
            message={((loadMore && fullContent) || content).message}
            className={`copyable-content whitespace-pre-wrap break-words ${
              isEmojiOnly ? 'text-7xl' : ''
            }`}
          />
          {hasMoreContent ? (
            <a
              className="mr-auto cursor-pointer text-primary hover:underline"
              onClick={() => setLoadMore((old) => !old)}
            >
              {loadMore ? t('Less') : t('More')}
            </a>
          ) : null}
        </div>
      </div>
      <CommunityReactions msg={msg} community={community} scrollRef={scrollRef} />
    </div>
  );
};

const MessageTextRenderer = ({
  community,
  message,
  className,
}: {
  community?: HomebaseFile<CommunityDefinition>;
  message: RichText | undefined;
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { text, ...renderableAttributes } = attributes || {};
          return (
            <p {...renderableAttributes} className="min-h-2 empty:min-h-0">
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
          const uniqueId =
            attributes.uniqueId && typeof attributes.uniqueId === 'string'
              ? attributes.uniqueId
              : undefined;

          // Fallback to the old way of storing the channel in the RichText
          const tagGuid = uniqueId || formatGuidId(toGuidId(attributes.value));

          const matchingChannel = channels?.find((channel) =>
            stringGuidsEqual(channel.fileMetadata.appData.uniqueId, tagGuid)
          );

          if (matchingChannel) {
            return (
              <Link
                to={`${COMMUNITY_ROOT_PATH}/${community?.fileMetadata.senderOdinId}/${community?.fileMetadata.appData.uniqueId}/${tagGuid}`}
                className="break-all text-primary hover:underline"
              >
                #{matchingChannel.fileMetadata.appData.content.title || attributes.value.trim()}{' '}
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
                data-tooltip={`@${attributes.value.replaceAll('@', '')}`}
              >
                @<ConnectionName odinId={attributes.value.replaceAll('@', '')} />
              </a>
            );
          else
            return (
              <span className="break-all font-semibold" data-tooltip={attributes.value}>
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
  originId,
  scrollRef,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
  originId?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
}) => {
  const content = msg.fileMetadata.appData.content;
  const hasACaption = !!content.message;

  const [loadMore, setLoadMore] = useState(false);
  const hasMoreContent = msg.fileMetadata.payloads?.some(
    (payload) => payload.key === DEFAULT_PAYLOAD_KEY
  );

  const { data: fullContent } = useContentFromPayload<CommunityMessage>(
    hasMoreContent && loadMore && community
      ? {
          odinId: community?.fileMetadata.senderOdinId,
          targetDrive: getTargetDriveFromCommunityId(
            community.fileMetadata.appData.uniqueId as string
          ),
          fileId: msg.fileId,
          payloadKey: DEFAULT_PAYLOAD_KEY,
          lastModified: msg.fileMetadata.payloads?.find((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)
            ?.lastModified,
          systemFileType: msg.fileSystemType,
        }
      : undefined
  );

  return (
    <div className={`relative w-full max-w-[75vw] rounded-lg md:max-w-[90%]`}>
      {hasACaption ? (
        <>
          <MessageTextRenderer
            community={community}
            message={((loadMore && fullContent) || content).message}
            className={`whitespace-pre-wrap break-words`}
          />
          {hasMoreContent ? (
            <a
              className="mr-auto cursor-pointer text-primary hover:underline"
              onClick={() => setLoadMore((old) => !old)}
            >
              {loadMore ? t('Less') : t('More')}
            </a>
          ) : null}
        </>
      ) : null}
      <CommunityMedia
        msg={msg}
        communityId={community?.fileMetadata.appData.uniqueId as string}
        odinId={community?.fileMetadata.senderOdinId as string}
        originId={originId}
      />
      <CommunityReactions msg={msg} community={community} scrollRef={scrollRef} />
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
    isFetched,
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

  // Auto heal bad data
  const [refetchCount, setRefetchCount] = useState(0);
  useEffect(() => {
    setRefetchCount((old) => {
      if (old <= 2) {
        if (isFetched && !flattenedMsgs.length) {
          console.warn(
            `[CommunityMessageThreadSummary] The message indicates there are replies, but we didn't find any ${msg.fileId} (${old})`
          );
          refetch();
        }
      }

      return old + 1;
    });
  }, [isFetched, flattenedMsgs]);

  if (!flattenedMsgs?.length) {
    if (isFetching && !isRefetching && refetchCount <= 2) return null;
    return (
      <div className="mt-1 rounded-md border bg-slate-100 p-2 dark:bg-slate-700">
        <p className="text-lg">{t('Bad data!')}</p>
        <p>
          {t("The message indicates there are replies, but we didn't find any")}{' '}
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
      className="mr-auto flex w-full max-w-sm flex-row items-center gap-2 rounded-lg px-1 py-1 text-indigo-500 transition-colors hover:bg-background hover:shadow-sm"
      to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/${channelKey || msg.fileMetadata.appData.content.channelId}/${msg.fileMetadata.appData.uniqueId}/thread`}
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
