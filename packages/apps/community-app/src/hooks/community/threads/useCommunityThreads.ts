import { HomebaseFile } from '@homebase-id/js-lib/core';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommunityMessage } from '../../../providers/CommunityMessageProvider';
import { findMentionedInRichText, useDotYouClientContext } from '@homebase-id/common-app';
import { useCommunityMetadata } from '../useCommunityMetadata';
import { useCommunityChannels } from '../channels/useCommunityChannels';
import { getCommunityMessagesInfiniteQueryOptions } from '../messages/useCommunityMessages';
import { useEffect } from 'react';
import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { useLastUpdatedCommunityMessages } from '../messages/useLastUpdatedCommunityMessages';

export interface ThreadMeta {
  threadId: string;
  channelId: string;
  lastMessageCreated: number;
  lastAuthor: string;
  participants: string[];
}

export const useCommunityThreads = ({
  odinId,
  communityId,
}: {
  odinId?: string;
  communityId?: string;
}) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getLoggedInIdentity();
  const { data: channels, isFetched } = useCommunityChannels({ odinId, communityId }).fetch;

  const lastUpdate = useLastUpdatedCommunityMessages({ communityId });
  useEffect(() => {
    if (lastUpdate)
      queryClient.refetchQueries({ queryKey: ['community-threads', formatGuidId(communityId)] });
  }, [lastUpdate]);

  const queryFn = async () => {
    if (!channels) return;

    const threadOrigins = (
      await Promise.all(
        channels.map(async (channel) => {
          const channelMessages = await queryClient.fetchInfiniteQuery(
            getCommunityMessagesInfiniteQueryOptions(
              dotYouClient,
              odinId,
              communityId,
              channel.fileMetadata.appData.uniqueId,
              undefined
            )
          );
          const flattenedMessages = channelMessages.pages.flatMap((page) => page.searchResults);
          return flattenedMessages.filter(
            (msg) =>
              !!msg?.fileMetadata.reactionPreview &&
              !!msg.fileMetadata.reactionPreview.totalCommentCount
          );
        })
      )
    ).flat();

    const allThreadMeta = await Promise.all(
      (threadOrigins.filter(Boolean) as HomebaseFile<CommunityMessage>[]).map(async (origin) => {
        if (!origin.fileMetadata.reactionPreview?.totalCommentCount) return;

        const replies = await queryClient.fetchInfiniteQuery(
          getCommunityMessagesInfiniteQueryOptions(
            dotYouClient,
            odinId,
            communityId,
            origin.fileMetadata.appData.content.channelId,
            origin.fileMetadata.globalTransitId as string
          )
        );

        const flattenedReplies = replies.pages
          .flatMap((page) => page.searchResults)
          .filter(Boolean) as HomebaseFile<CommunityMessage>[];

        const participants = flattenedReplies.concat(origin).flatMap((msg) => {
          const currentMessageMentions =
            typeof msg.fileMetadata.appData.content.message === 'string'
              ? []
              : findMentionedInRichText(msg.fileMetadata.appData.content.message);
          return [
            ...currentMessageMentions,
            ...(msg.fileMetadata.appData.content.collaborators || []),
            msg.fileMetadata.senderOdinId,
          ];
        });

        const repliesWithoutMine = flattenedReplies.filter(
          (msg) => msg.fileMetadata.originalAuthor !== identity
        );

        return {
          threadId: origin.fileMetadata.appData.uniqueId as string,
          channelId: origin.fileMetadata.appData.content.channelId,
          lastMessageCreated: repliesWithoutMine[0]?.fileMetadata.created || 0,
          lastAuthor: repliesWithoutMine[0]?.fileMetadata.senderOdinId || '',
          participants: Array.from(new Set(participants)),
        };
      })
    );

    return (
      allThreadMeta.filter(
        (meta) => meta && identity && meta.participants.includes(identity)
      ) as ThreadMeta[]
    ).sort((a, b) => b.lastMessageCreated - a.lastMessageCreated);
  };

  return useQuery({
    queryKey: ['community-threads', formatGuidId(communityId)],
    queryFn: queryFn,
    enabled: isFetched,
    staleTime: 1000, // 1s just enough to avoid double fetching on load
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
};

export const invalidateCommunityThreads = (queryClient: QueryClient, communityId: string) => {
  queryClient.invalidateQueries({ queryKey: ['community-threads', formatGuidId(communityId)] });
};

export const useLastUpdatedThreadExcludingMine = (props: {
  odinId: string | undefined;
  communityId: string | undefined;
}) => {
  const identity = useDotYouClientContext().getLoggedInIdentity();
  const { data: flattedThreads } = useCommunityThreads(props);

  return flattedThreads
    ?.filter((thread) => thread.lastAuthor !== identity)
    ?.reduce(
      (acc, thread) => {
        if (thread.lastAuthor === identity) return acc;

        if (!acc || acc.lastMessageCreated < thread.lastMessageCreated) {
          return thread;
        }
        return acc;
      },
      undefined as ThreadMeta | undefined
    );
};

export const useHasUnreadThreads = (props: { odinId: string; communityId: string }) => {
  const { data: metadata } = useCommunityMetadata(props).single;
  const lastUpdatedThread = useLastUpdatedThreadExcludingMine(props);

  return (
    lastUpdatedThread &&
    (!metadata ||
      metadata?.fileMetadata.appData.content.threadsLastReadTime <
        lastUpdatedThread.lastMessageCreated)
  );
};
