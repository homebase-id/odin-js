import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  UndefinedInitialDataInfiniteOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CommunityMessage,
  getCommunityMessages,
  hardDeleteCommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { DotYouClient, HomebaseFile } from '@youfoundation/js-lib/core';

import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';

const PAGE_SIZE = 100;
export const useCommunityMessages = (props?: {
  communityId: string | undefined;
  originId?: string;
  channelId?: string;
}) => {
  const { communityId, originId, channelId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const removeMessage = async ({
    community,
    messages,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    messages: HomebaseFile<CommunityMessage>[];
  }) => {
    const communityContent = community.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = communityContent.recipients.filter((recipient) => recipient !== identity);

    if (!community.fileMetadata.appData.uniqueId) {
      throw new Error('Community unique id is not set');
    }

    return await Promise.all(
      messages.map(async (msg) => {
        await hardDeleteCommunityMessage(
          dotYouClient,
          community.fileMetadata.appData.uniqueId as string,
          msg,
          recipients
        );
      })
    );
  };

  return {
    all: useInfiniteQuery(
      getCommunityMessagesInfiniteQueryOptions(dotYouClient, communityId, channelId, originId)
    ),
    delete: useMutation({
      mutationFn: removeMessage,

      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['community-messages', variables.community.fileMetadata.appData.uniqueId],
        });

        // TODO: Invalidate the threads?
      },
    }),
  };
};

const fetchMessages = async (
  dotYouClient: DotYouClient,
  communityId: string,
  originId: string | undefined,
  channelId: string | undefined,
  cursorState: string | undefined
) =>
  await getCommunityMessages(
    dotYouClient,
    communityId,
    originId ? [originId] : undefined,
    channelId ? [channelId] : undefined,
    cursorState,
    PAGE_SIZE
  );

export const getCommunityMessagesInfiniteQueryOptions: (
  dotYouClient: DotYouClient,
  communityId?: string,
  channelId?: string,
  originId?: string
) => UndefinedInitialDataInfiniteOptions<{
  searchResults: (HomebaseFile<CommunityMessage> | null)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> = (dotYouClient, communityId, channelId, originId) => ({
  queryKey: ['community-messages', communityId, channelId || 'any', originId || 'root'],
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) =>
    fetchMessages(
      dotYouClient,
      communityId as string,
      originId,
      channelId,
      pageParam as string | undefined
    ),
  getNextPageParam: (lastPage) =>
    lastPage?.searchResults && lastPage?.searchResults?.length >= PAGE_SIZE
      ? lastPage.cursorState
      : undefined,
  enabled: !!communityId,
  refetchOnMount: false,
  refetchOnReconnect: false,
  staleTime: 1000 * 60 * 60 * 24, // 24 hour
});

export const insertNewMessagesForConversation = (
  queryClient: QueryClient,
  conversationId: string,
  newMessages: HomebaseFile<CommunityMessage>[]
) => {
  const extistingMessages = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['community-messages', conversationId]);

  if (newMessages.length > PAGE_SIZE || !extistingMessages) {
    queryClient.setQueryData(
      ['community-messages', conversationId],
      (data: InfiniteData<unknown, unknown>) => {
        return {
          pages: data?.pages?.slice(0, 1) ?? [],
          pageParams: data?.pageParams?.slice(0, 1) || [undefined],
        };
      }
    );
    queryClient.invalidateQueries({ queryKey: ['community-messages', conversationId] });
    return;
  }

  let runningMessages = extistingMessages;
  newMessages.forEach((newMessage) => {
    runningMessages = internalInsertNewMessage(runningMessages, newMessage);
  });

  queryClient.setQueryData(['community-messages', conversationId], runningMessages);
};

export const insertNewMessage = (
  queryClient: QueryClient,
  newMessage: HomebaseFile<CommunityMessage>
) => {
  const conversationId = newMessage.fileMetadata.appData.groupId;

  const extistingMessages = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['community-messages', conversationId]);

  if (extistingMessages) {
    queryClient.setQueryData(
      ['community-messages', conversationId],
      internalInsertNewMessage(extistingMessages, newMessage)
    );
  } else {
    queryClient.invalidateQueries({ queryKey: ['community-messages', conversationId] });
  }

  queryClient.setQueryData(['chat-message', newMessage.fileMetadata.appData.uniqueId], newMessage);
};

export const internalInsertNewMessage = (
  extistingMessages: InfiniteData<
    {
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    },
    unknown
  >,
  newMessage: HomebaseFile<CommunityMessage>
) => {
  const isNewFile = !extistingMessages.pages.some((page) =>
    page.searchResults.some(
      (msg) =>
        (newMessage.fileId && stringGuidsEqual(msg?.fileId, newMessage?.fileId)) ||
        (newMessage.fileMetadata.appData.uniqueId &&
          stringGuidsEqual(
            msg?.fileMetadata.appData.uniqueId,
            newMessage.fileMetadata.appData.uniqueId
          ))
    )
  );

  const newData = {
    ...extistingMessages,
    pages: extistingMessages?.pages?.map((page, index) => {
      if (isNewFile) {
        const filteredSearchResults = page.searchResults.filter(
          // Remove messages with the same fileId but more importantly uniqueId so we avoid duplicates with the optimistic update
          (msg) => {
            if (!msg) return false;

            if (newMessage.fileMetadata.appData.uniqueId) {
              return !stringGuidsEqual(
                msg?.fileMetadata.appData.uniqueId,
                newMessage.fileMetadata.appData.uniqueId
              );
            } else if (newMessage.fileId) {
              return !stringGuidsEqual(msg?.fileId, newMessage.fileId);
            }

            return true;
          }
        ) as HomebaseFile<CommunityMessage>[];

        return {
          ...page,
          searchResults:
            index === 0
              ? [newMessage, ...filteredSearchResults].sort(
                  (a, b) => b.fileMetadata.created - a.fileMetadata.created
                ) // Re-sort the first page, as the new message might be older than the first message in the page;
              : filteredSearchResults,
        };
      }

      return {
        ...page,
        searchResults: page.searchResults.reduce((acc, msg) => {
          if (!msg) return acc;

          // FileId Duplicates: Message with same fileId is already in searchResults
          if (msg.fileId && acc.some((m) => stringGuidsEqual(m?.fileId, msg.fileId))) {
            return acc;
          }

          // UniqueId Duplicates: Message with same uniqueId is already in searchResults
          if (
            msg.fileMetadata.appData.uniqueId &&
            acc.some((m) =>
              stringGuidsEqual(m?.fileMetadata.appData.uniqueId, msg.fileMetadata.appData.uniqueId)
            )
          ) {
            return acc;
          }

          // Message in cache was from the server, then updating with fileId is enough
          if (msg.fileId && stringGuidsEqual(msg.fileId, newMessage.fileId)) {
            acc.push(newMessage);
            return acc;
          }

          // Message in cache is from unknown, then ensure if we need to update the message based on uniqueId
          if (
            msg.fileMetadata.appData.uniqueId &&
            stringGuidsEqual(
              msg.fileMetadata.appData.uniqueId,
              newMessage.fileMetadata.appData.uniqueId
            )
          ) {
            acc.push(newMessage);
            return acc;
          }

          acc.push(msg);
          return acc;
        }, [] as HomebaseFile<CommunityMessage>[]),
      };
    }),
  };

  return newData;
};
//
