import { DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { QueryClient, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  CommunityMessage,
  getCommunityMessages,
} from '../../../providers/CommunityMessageProvider';
import { findMentionedInRichText, useDotYouClientContext } from '@homebase-id/common-app';
import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { getCommunityMessageQueryOptions } from '../messages/useCommunityMessage';

const PAGE_SIZE = 100;

export const useCommunityThreads = ({
  odinId,
  communityId,
  onlyWithMe,
}: {
  odinId?: string;
  communityId?: string;
  onlyWithMe?: boolean;
}) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  return {
    all: useInfiniteQuery({
      queryFn: ({ pageParam }) =>
        fetchCommunityThreads(
          queryClient,
          dotYouClient,
          odinId as string,
          communityId as string,
          onlyWithMe,
          pageParam
        ),
      queryKey: ['community-threads', formatGuidId(communityId), onlyWithMe ? 'me' : ''],
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.searchResults && lastPage?.searchResults?.length >= PAGE_SIZE
          ? lastPage.cursorState
          : undefined,
      staleTime: 1000 * 60 * 60 * 24, // 24 hour
      enabled: !!odinId && !!communityId,
    }),
  };
};

export interface ThreadMeta {
  threadId: string;
  channelId: string;
  lastMessageCreated: number;
  participants: string[];
}

const fetchCommunityThreads = async (
  queryClient: QueryClient,
  dotYouClient: DotYouClient,
  odinId: string,
  communityId: string,
  onlyWithMe: boolean | undefined,
  cursorState: string | undefined
) => {
  const allThreadMessages = await getCommunityMessages(
    dotYouClient,
    odinId,
    communityId,
    undefined,
    undefined,
    cursorState,
    PAGE_SIZE,
    'Comment'
  );

  const extendMetaWithNewMessage = (
    meta: ThreadMeta | undefined,
    thread: HomebaseFile<CommunityMessage>
  ) => {
    if (!thread.fileMetadata.appData.content.threadId && !meta?.threadId) return meta;

    const currentMessageMentions =
      typeof thread.fileMetadata.appData.content.message === 'string'
        ? []
        : findMentionedInRichText(thread.fileMetadata.appData.content.message);

    const threadMeta: ThreadMeta = {
      ...meta,
      threadId: (meta?.threadId || thread.fileMetadata.appData.content.threadId) as string,
      channelId: thread.fileMetadata.appData.content.channelId,
      lastMessageCreated: Math.max(meta?.lastMessageCreated || 0, thread.fileMetadata.created),
      participants: Array.from(
        new Set([
          ...(meta?.participants || []),
          ...currentMessageMentions,
          thread.fileMetadata.senderOdinId,
        ])
      ),
    };

    return threadMeta;
  };

  const allThreads = allThreadMessages.searchResults.reduce(
    (acc, thread) => {
      if (!thread.fileMetadata.appData.content.threadId) return acc;

      const existingThreadMeta = acc[formatGuidId(thread.fileMetadata.appData.content.threadId)];
      const threadMeta = extendMetaWithNewMessage(existingThreadMeta, thread);

      return {
        ...acc,
        [formatGuidId(thread.fileMetadata.appData.content.threadId)]: threadMeta,
      };
    },
    {} as Record<string, ThreadMeta | undefined>
  );

  for (let i = 0; i < Object.keys(allThreads).length; i++) {
    const threadId = Object.keys(allThreads)[i];
    const originMessage = await queryClient.fetchQuery(
      getCommunityMessageQueryOptions(queryClient, dotYouClient, {
        odinId,
        communityId,
        messageId: threadId,
      })
    );

    if (!originMessage) continue;
    allThreads[threadId] = extendMetaWithNewMessage(allThreads[threadId], originMessage);
  }

  return {
    searchResults: (
      Object.values(allThreads).filter((threadMeta) => {
        if (!threadMeta) return false;

        if (onlyWithMe) return threadMeta.participants.includes(dotYouClient.getLoggedInIdentity());
        else return true;
      }) as ThreadMeta[]
    ).sort((a, b) => b.lastMessageCreated - a.lastMessageCreated),
    cursorState: allThreadMessages.cursorState,
  };
};
