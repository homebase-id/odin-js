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
import { DeletedHomebaseFile, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';

import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { useState, useEffect } from 'react';

const PAGE_SIZE = 100;
export const useCommunityMessages = (props?: {
  communityId: string | undefined;
  channelId?: string;
  threadId?: string;
  maxAge?: number;
}) => {
  const { communityId, threadId, channelId, maxAge } = props || {};
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
      getCommunityMessagesInfiniteQueryOptions(
        dotYouClient,
        communityId,
        channelId,
        threadId,
        maxAge
      )
    ),
    delete: useMutation({
      mutationFn: removeMessage,

      onSettled: async (_data, _error, variables) => {
        variables.messages.forEach((msg) => {
          queryClient.invalidateQueries({
            queryKey: ['community-messages', msg.fileMetadata.appData.groupId],
          });
        });

        // TODO: Invalidate the threads?
      },
    }),
  };
};

const fetchMessages = async (
  dotYouClient: DotYouClient,
  communityId: string,
  channelId: string | undefined,
  threadId: string | undefined,
  cursorState: string | undefined
) => {
  if (stringGuidsEqual(communityId, threadId)) {
    throw new Error('ThreadId and CommunityId cannot be the same');
  }

  const groupIds = threadId ? [threadId] : channelId ? [channelId] : undefined;

  return await getCommunityMessages(
    dotYouClient,
    communityId,
    groupIds,
    undefined,
    cursorState,
    PAGE_SIZE
  );
};

export const getCommunityMessagesInfiniteQueryOptions: (
  dotYouClient: DotYouClient,
  communityId?: string,
  channelId?: string,
  threadId?: string,
  maxAge?: number
) => UndefinedInitialDataInfiniteOptions<{
  searchResults: (HomebaseFile<CommunityMessage> | null)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> = (dotYouClient, communityId, channelId, threadId, maxAge) => {
  if (stringGuidsEqual(communityId, threadId)) {
    throw new Error('ThreadId and CommunityId cannot be the same');
  }
  return {
    queryKey: ['community-messages', threadId || channelId || communityId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      if (stringGuidsEqual(communityId, threadId)) {
        throw new Error('ThreadId and CommunityId cannot be the same');
      }

      return fetchMessages(
        dotYouClient,
        communityId as string,
        channelId,
        threadId,
        pageParam as string | undefined
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage?.searchResults && lastPage?.searchResults?.length >= PAGE_SIZE
        ? lastPage.cursorState
        : undefined,
    select: maxAge
      ? (data) => {
          const filteredData = { ...data };
          filteredData.pages = data.pages.map((page) => {
            const filteredPage = { ...page };

            filteredPage.searchResults = page.searchResults.filter((msg) => {
              if (!msg) return false;
              return msg.fileMetadata.created > maxAge;
            });

            return filteredPage;
          });
          return filteredData;
        }
      : undefined,
    enabled: !!communityId && (!!channelId || !!threadId),
    refetchOnMount: true,
    staleTime: 1000 * 60 * 60 * 24, // 24 hour
  };
};

export const useLastUpdatedChatMessages = () => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    const lastUpdates = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['community-messages'], exact: false })
      .map((query) => query.state.dataUpdatedAt);

    setLastUpdate(
      lastUpdates.reduce((acc, val) => {
        if (val > acc) {
          return val;
        }

        return acc;
      }, 0)
    );
  });

  return {
    lastUpdate,
  };
};

// Inserters

export const insertNewMessagesForChannel = (
  queryClient: QueryClient,
  channelId: string,
  newMessages: (HomebaseFile<CommunityMessage> | DeletedHomebaseFile)[]
) => {
  const extistingMessages = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['community-messages', channelId]);

  if (
    newMessages.length > PAGE_SIZE ||
    !extistingMessages ||
    newMessages?.some((msg) => msg.fileState === 'deleted')
  ) {
    queryClient.setQueryData(
      ['community-messages', channelId],
      (data: InfiniteData<unknown, unknown>) => {
        return {
          pages: data?.pages?.slice(0, 1) ?? [],
          pageParams: data?.pageParams?.slice(0, 1) || [undefined],
        };
      }
    );
    queryClient.invalidateQueries({
      queryKey: ['community-messages', channelId],
    });
    return;
  }

  let runningMessages = extistingMessages;
  newMessages.forEach((newMessage) => {
    runningMessages = internalInsertNewMessage(
      runningMessages,
      newMessage as HomebaseFile<CommunityMessage>
    );
  });

  queryClient.setQueryData(['community-messages', channelId], runningMessages);
};

export const insertNewMessage = (
  queryClient: QueryClient,
  newMessage: HomebaseFile<CommunityMessage> | DeletedHomebaseFile,
  communityId: string
) => {
  const extistingMessages = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['community-messages', newMessage.fileMetadata.appData.groupId || communityId]);

  if (extistingMessages && newMessage.fileState !== 'deleted') {
    queryClient.setQueryData(
      ['community-messages', newMessage.fileMetadata.appData.groupId || communityId],
      internalInsertNewMessage(extistingMessages, newMessage)
    );
  } else {
    queryClient.invalidateQueries({
      queryKey: ['community-messages', newMessage.fileMetadata.appData.groupId || communityId],
    });
  }
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
