import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  CommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ErrorNotification,
  findMentionedInRichText,
  formatToDateAgoWithRelativeDetail,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { CommunityMessageItem } from '../Message/item/CommunityMessageItem';
import { useCommunityMessages } from '../../../hooks/community/messages/useCommunityMessages';
import { CommunityActions } from './ContextMenu';
import { Link, useParams } from 'react-router-dom';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const CommunityHistory = memo(
  (props: {
    community: HomebaseFile<CommunityDefinition> | undefined;
    channel: HomebaseFile<CommunityChannel> | undefined;
    origin?: HomebaseFile<CommunityMessage>;
    doOpenThread?: (msg: HomebaseFile<CommunityMessage>) => void;
    setIsEmptyChat?: (isEmpty: boolean) => void;
    alignTop?: boolean;
    maxAge?: number | undefined;
    maxShowOptions?: { count: number; targetLink: string };
    emptyPlaceholder?: ReactNode;
    setParticipants?: React.Dispatch<React.SetStateAction<string[] | null | undefined>>;
  }) => {
    const {
      community,
      channel,
      origin,
      doOpenThread,
      setIsEmptyChat,
      alignTop,
      maxAge,
      maxShowOptions,
      emptyPlaceholder,
      setParticipants,
    } = props;

    const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
    const scrollRef = useRef<HTMLDivElement>(null);
    const inAThread =
      !!origin && origin.fileMetadata.appData.fileType === COMMUNITY_MESSAGE_FILE_TYPE;

    if (inAThread && !origin.fileMetadata.globalTransitId) {
      throw new Error('Origin message is missing globalTransitId');
    }

    const {
      all: {
        data: messages,
        hasNextPage: hasMoreMessages,
        fetchNextPage,
        isFetchingNextPage,
        isFetched,
      },
      delete: { mutate: deleteMessages, error: deleteMessagesError },
    } = useCommunityMessages({
      odinId: community?.fileMetadata.senderOdinId,
      communityId: community?.fileMetadata?.appData?.uniqueId,
      channelId: channel?.fileMetadata?.appData?.uniqueId,
      threadId: origin?.fileMetadata.globalTransitId,
    });

    const [flattenedMsgs, slicedCount] = useMemo(() => {
      const flat: HomebaseFile<CommunityMessage>[] = [];
      let slicedCount = 0;

      messages?.pages?.forEach((page) => {
        page?.searchResults?.forEach((result) => {
          if (result) {
            if (maxAge && result.fileMetadata.created < maxAge) {
              slicedCount++;
              return;
            }
            flat.push(result);
          }
        });
      });

      flat.sort((a, b) => b.fileMetadata.created - a.fileMetadata.created);
      if (inAThread) flat.push(origin);
      if (!maxShowOptions) return [flat, slicedCount];

      const maxShow = maxShowOptions.count;
      const slicedMsgs = flat.slice(0, maxShow);
      if (inAThread && slicedMsgs.indexOf(origin) === -1) {
        slicedMsgs.push(origin);
      }

      return [slicedMsgs, slicedCount + (flat.length > maxShow ? flat.length - maxShow : 0)];
    }, [messages, origin, maxShowOptions, inAThread, maxAge]);

    useEffect(() => {
      if (setIsEmptyChat && isFetched && (!flattenedMsgs || flattenedMsgs.length === 0))
        setIsEmptyChat(true);
    }, [isFetched, flattenedMsgs]);

    //   useMarkMessagesAsRead({ conversation, messages: flattenedMsgs });
    const communityActions: CommunityActions = useMemo(
      () => ({
        doDelete: async (msg: HomebaseFile<CommunityMessage>) => {
          if (!community || !msg) return;

          await deleteMessages({
            community: community,
            messages: [msg],
          });
        },
      }),
      [community, deleteMessages]
    );

    if (doOpenThread && !inAThread)
      communityActions.doReply = (msg: HomebaseFile<CommunityMessage>) => doOpenThread(msg);

    const count = flattenedMsgs?.length + 1;
    const virtualizer = useVirtualizer({
      getScrollElement: () => scrollRef.current,
      count,
      estimateSize: () => 50,
      // Custom scroll handler to support inverted rendering
      observeElementOffset: (instance, cb) => {
        const element = instance.scrollElement;
        if (!element) return;

        const createHandler = (isScrolling: boolean) => () => {
          // Math.abs as the element.scrollTop will be negative with the flex-col-reverse container
          cb(Math.abs(element.scrollTop), isScrolling);
        };

        // Start scroll is always 0, as the flex-col-reverse contents start at the bottom
        cb(0, false);

        const handler = createHandler(true);
        const endHandler = createHandler(false);
        element.addEventListener('scroll', handler, {
          passive: true,
        });
        element.addEventListener('scrollend', endHandler, {
          passive: true,
        });

        return () => {
          element.removeEventListener('scroll', handler);
          element.removeEventListener('scrollend', endHandler);
        };
      },
      scrollToFn: (offset, { adjustments, behavior }, instance) => {
        const toOffest = (offset + (adjustments || 0)) * -1;

        instance.scrollElement?.scrollTo({ top: toOffest, behavior });
        setTimeout(() => instance.scrollElement?.scrollTo({ top: toOffest, behavior }), 0);
      },
      initialOffset: 0,
      overscan: 10,
      getItemKey: (index) => flattenedMsgs[index]?.fileId || `loader-${index}`,
    });

    const items = virtualizer.getVirtualItems();
    useEffect(() => {
      const [lastItem] = virtualizer.getVirtualItems();
      if (!lastItem) return;
      if (
        lastItem.index >= flattenedMsgs?.length - 1 &&
        hasMoreMessages &&
        !isFetchingNextPage &&
        !slicedCount
      )
        fetchNextPage();
    }, [
      hasMoreMessages,
      fetchNextPage,
      flattenedMsgs?.length,
      isFetchingNextPage,
      virtualizer.getVirtualItems(),
    ]);

    useEffect(() => {
      if (setParticipants && inAThread) {
        const involvedAuthors = flattenedMsgs.flatMap((msg) => [
          msg.fileMetadata.originalAuthor,
          ...(msg.fileMetadata.appData.content.collaborators || []),
        ]);
        const mentionedAuthors = flattenedMsgs
          .map((msg) =>
            Array.isArray(msg.fileMetadata.appData.content.message)
              ? findMentionedInRichText(msg.fileMetadata.appData.content.message)
              : []
          )
          .flat();

        setParticipants(
          Array.from(
            new Set([
              ...involvedAuthors,
              ...((mentionedAuthors.includes('@channel')
                ? community?.fileMetadata.appData.content.members
                : undefined) || mentionedAuthors),
            ])
          ) || []
        );
      }
    }, [flattenedMsgs, setParticipants]);

    // Scroll to chat message key; With setTimeout as the virtualizer needs to be rendered
    //   per scroll position to know where we're scrolling to
    const MAX_SCROLL_ATTEMPTS = 50;
    const [, setScrollAttempt] = useState(0);
    const { chatMessageKey, threadKey } = useParams();
    useEffect(() => {
      if (!chatMessageKey || !!threadKey) return;
      const chatIndex = flattenedMsgs.findIndex((msg) =>
        stringGuidsEqual(msg.fileMetadata.appData.uniqueId, chatMessageKey)
      );

      if (chatIndex === -1) {
        if (hasMoreMessages) fetchNextPage();
        return;
      }
      const innerScroll = () => {
        setScrollAttempt((scrollAttempt) => {
          const [rawOffset] = virtualizer.getOffsetForIndex(chatIndex) || [0];
          const offset = rawOffset * -1;

          const scrollTop = scrollRef.current?.scrollTop;

          if (scrollTop !== offset && scrollAttempt < MAX_SCROLL_ATTEMPTS) {
            scrollRef.current?.scrollTo({ top: offset });
            setTimeout(() => {
              innerScroll();
            });
          }
          return scrollAttempt + 1;
        });
      };
      innerScroll();
    }, [flattenedMsgs]);

    if (emptyPlaceholder && isFetched && (!flattenedMsgs || flattenedMsgs.length === 0))
      return <>{emptyPlaceholder}</>;
    return (
      <>
        <ErrorNotification error={deleteMessagesError} />
        <div
          className={`flex w-full ${alignTop ? '' : 'flex-grow'} faded-scrollbar flex-col-reverse overflow-auto py-0 sm:py-1 lg:py-5`}
          ref={scrollRef}
          key={channel?.fileId || community?.fileId}
          style={{ overflowAnchor: 'none' }}
          data-query-group-id={
            origin?.fileMetadata.globalTransitId ||
            channel?.fileMetadata?.appData?.uniqueId ||
            community?.fileMetadata?.appData?.uniqueId
          }
        >
          <div
            className="relative w-full flex-shrink-0 flex-grow-0 overflow-hidden" // This overflow-hidden cuts of the context-menu of the first chat-items; But we need it as it otherwise breaks the scroll edges
            style={{
              height: virtualizer.getTotalSize(),
            }}
          >
            <div
              className="absolute bottom-0 left-0 flex h-full w-full flex-col justify-end"
              style={{
                transform: `translateY(-${items[0]?.start ?? 0}px)`,
              }}
            >
              {items.reverse().map((item) => {
                const isLoaderRow = item.index > flattenedMsgs?.length - 1;
                if (isLoaderRow) {
                  return (
                    <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}>
                      {(hasMoreMessages && !maxShowOptions && !slicedCount) ||
                      isFetchingNextPage ? (
                        <div className="animate-pulse" key={'loading'}>
                          {t('Loading...')}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                const msg = flattenedMsgs[item.index];
                const currentAuthor = msg?.fileMetadata.originalAuthor || loggedOnIdentity || '';
                const currentDate = msg?.fileMetadata.created;
                const currentCollaborative = msg?.fileMetadata.appData.content.isCollaborative;

                const previousVisibleMsg = flattenedMsgs[item.index + 1];
                const previousAuthor =
                  previousVisibleMsg?.fileMetadata.originalAuthor || loggedOnIdentity || '';
                const previousDate = previousVisibleMsg?.fileMetadata.created;
                const previousCollaborative =
                  previousVisibleMsg?.fileMetadata.appData.content.isCollaborative;

                return (
                  <div
                    key={item.key}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    className="flex-shrink-0"
                  >
                    <DateSeperator previousDate={previousDate} date={currentDate} />
                    <CommunityMessageItem
                      scrollRef={scrollRef}
                      key={msg.fileId || msg.fileMetadata.appData.uniqueId}
                      msg={msg}
                      community={community}
                      communityActions={communityActions}
                      hideDetails={
                        previousAuthor === currentAuthor &&
                        Math.abs(previousDate - currentDate) < 1000 * 60 * 5 &&
                        !previousCollaborative &&
                        !currentCollaborative
                      }
                      hideThreads={inAThread}
                      className="px-2 py-1 md:px-3"
                      showChannelName={!channel && !inAThread}
                      originId={origin?.fileMetadata.appData.uniqueId}
                    />
                    {msg === origin && slicedCount && maxShowOptions?.targetLink ? (
                      <div className="flex flex-row justify-center">
                        <Link
                          to={maxShowOptions?.targetLink}
                          className="rounded-full bg-page-background px-3 py-2 text-sm font-medium text-foreground opacity-50 hover:bg-primary hover:text-primary-contrast hover:opacity-100"
                        >
                          {t('See {0} more replies', slicedCount > 100 ? '100 +' : slicedCount)}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }
);
CommunityHistory.displayName = 'CommunityHistory';

const DateSeperator = ({ previousDate, date }: { previousDate?: number; date?: number }) => {
  if (!date) return null;

  const previousDay = previousDate && new Date(previousDate).getDate();
  const day = new Date(date).getDate();

  if (previousDay === day) return null;

  return (
    <div className="flex justify-center py-2">
      <div className="rounded-full bg-page-background px-3 py-2 text-sm font-medium text-foreground">
        {formatToDateAgoWithRelativeDetail(new Date(date))}
      </div>
    </div>
  );
};
