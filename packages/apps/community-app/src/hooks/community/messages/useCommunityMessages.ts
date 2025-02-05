import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  UndefinedInitialDataInfiniteOptions,
  useMutation,
  useQueryClient,
  SetDataOptions,
} from '@tanstack/react-query';
import {
  CommunityMessage,
  getCommunityMessages,
  hardDeleteCommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import {
  DeletedHomebaseFile,
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
} from '@homebase-id/js-lib/core';

import { formatGuidId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { invalidateCommunityMessage, updateCacheCommunityMessage } from './useCommunityMessage';

const PAGE_SIZE = 100;
export const useCommunityMessages = (props?: {
  odinId: string | undefined;
  communityId: string | undefined;
  channelId?: string;
  threadId?: string;
  maxAge?: number;
}) => {
  const { odinId, communityId, threadId, channelId, maxAge } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const removeMessage = async ({
    community,
    messages,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    messages: HomebaseFile<CommunityMessage>[];
  }) => {
    if (!community.fileMetadata.appData.uniqueId) {
      throw new Error('Community unique id is not set');
    }

    return await Promise.all(
      messages.map(async (msg) => {
        await hardDeleteCommunityMessage(
          dotYouClient,
          community.fileMetadata.senderOdinId,
          community.fileMetadata.appData.uniqueId as string,
          msg
        );
      })
    );
  };

  return {
    all: useInfiniteQuery(
      getCommunityMessagesInfiniteQueryOptions(
        dotYouClient,
        odinId,
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
          invalidateCommunityMessages(
            queryClient,
            variables.community.fileMetadata.appData.uniqueId as string,
            msg.fileMetadata.appData.groupId
          );
        });
      },
    }),
  };
};

export const invalidateCommunityMessages = (
  queryClient: QueryClient,
  communityId: string,
  channelId?: string,
  threadId?: string
) => {
  const queryKey = [
    'community-messages',
    formatGuidId(communityId),
    formatGuidId(threadId || channelId || communityId),
  ].filter(Boolean);

  if (queryKey.length > 2) {
    queryClient.setQueryData(queryKey, (data: InfiniteData<unknown, unknown>) => {
      if (!data?.pages?.length || data?.pages?.length === 1) return data;

      return {
        pages: data?.pages?.slice(0, 1) ?? [],
        pageParams: data?.pageParams?.slice(0, 1) || [undefined],
      };
    });
  }

  queryClient.invalidateQueries({
    queryKey: queryKey,
    exact: !!(threadId || channelId || communityId),
  });
};

type TransformFnReturnData =
  | InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | NewHomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  | undefined;
export const updateCacheCommunityMessages = (
  queryClient: QueryClient,
  communityId: string,
  channelId: string | undefined,
  threadId: string | undefined,
  transformFn: (
    data: InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  ) => TransformFnReturnData | { data: TransformFnReturnData; options?: SetDataOptions }
) => {
  const queryKey = [
    'community-messages',
    formatGuidId(communityId),
    formatGuidId(threadId || channelId || communityId),
  ];

  const currentData = queryClient.getQueryData<
    InfiniteData<{
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(queryKey);
  if (!currentData || !currentData.pages?.length) return;

  const transformResult = transformFn(currentData);
  const newData =
    (transformResult && 'data' in transformResult && transformResult?.data) ||
    (transformResult as TransformFnReturnData);
  if (!newData || !newData.pages) return;

  queryClient.setQueryData(
    queryKey,
    newData,
    (transformResult && 'options' in transformResult && transformResult.options) || undefined
  );

  return currentData;
};

const fetchMessages = async (
  dotYouClient: DotYouClient,
  odinId: string,
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
    odinId,
    communityId,
    groupIds,
    undefined,
    cursorState,
    PAGE_SIZE,
    threadId ? 'Comment' : undefined
  );
};

export const getCommunityMessagesInfiniteQueryOptions: (
  dotYouClient: DotYouClient,
  odinId?: string,
  communityId?: string,
  channelId?: string,
  threadId?: string,
  maxAge?: number
) => UndefinedInitialDataInfiniteOptions<{
  searchResults: (HomebaseFile<CommunityMessage> | null)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> = (dotYouClient, odinId, communityId, channelId, threadId, maxAge) => {
  if (stringGuidsEqual(communityId, threadId)) {
    throw new Error('ThreadId and CommunityId cannot be the same');
  }
  return {
    queryKey: [
      'community-messages',
      formatGuidId(communityId),
      formatGuidId(threadId || channelId || communityId),
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      if (stringGuidsEqual(communityId, threadId)) {
        throw new Error('ThreadId and CommunityId cannot be the same');
      }

      return fetchMessages(
        dotYouClient,
        odinId as string,
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
    select: !maxAge
      ? undefined
      : (data) => ({
          ...data,
          pages: data.pages.map((page) => {
            const filteredPage = {
              ...page,

              searchResults: page.searchResults.filter((msg) => {
                if (!msg) return false;
                return msg.fileMetadata.created > maxAge;
              }),
            };

            return filteredPage;
          }),
        }),
    enabled: !!odinId && !!communityId && (!!channelId || !!threadId),
    refetchOnMount: true,
    staleTime: 1000 * 60 * 60 * 24, // 24 hour
  };
};

// Inserters

export const insertNewMessagesForChannel = (
  queryClient: QueryClient,
  communityId: string,
  channelId: string,
  newMessages: (HomebaseFile<CommunityMessage> | DeletedHomebaseFile)[]
) => {
  const extistingMessages = updateCacheCommunityMessages(
    queryClient,
    communityId,
    channelId,
    channelId,
    (data) => {
      let runningMessages = data;
      newMessages.forEach((newMessage) => {
        runningMessages = internalInsertNewMessage(
          runningMessages,
          newMessage as HomebaseFile<CommunityMessage>
        );
      });

      return {
        data: runningMessages,
        options: {
          updatedAt:
            newMessages.reduce((acc, msg) => Math.max(acc, msg.fileMetadata.created), 0) ||
            undefined,
        },
      };
    }
  );

  if (
    newMessages.length > PAGE_SIZE ||
    !extistingMessages ||
    newMessages?.some((msg) => msg.fileState === 'deleted')
  ) {
    invalidateCommunityMessages(queryClient, communityId, channelId);
    return;
  }
};

export const insertNewMessage = (
  queryClient: QueryClient,
  newMessage: HomebaseFile<CommunityMessage> | DeletedHomebaseFile,
  communityId: string
) => {
  console.log('inserting new message', newMessage);

  const extistingMessages = updateCacheCommunityMessages(
    queryClient,
    communityId,
    newMessage.fileMetadata.appData.groupId as string,
    undefined,
    (data) => {
      if (newMessage.fileState === 'deleted') {
        return {
          data: internalRemoveMessage(data, newMessage),
          options: { updatedAt: newMessage.fileMetadata.created || undefined },
        };
      } else {
        return {
          data: internalInsertNewMessage(data, newMessage),
          options: { updatedAt: newMessage.fileMetadata.created || undefined },
        };
      }
    }
  );

  if (!extistingMessages) {
    invalidateCommunityMessages(
      queryClient,
      communityId,
      newMessage.fileMetadata.appData.groupId as string
    );
  }

  if (newMessage.fileState !== 'deleted') {
    updateCacheCommunityMessage(
      queryClient,
      communityId,
      newMessage.fileMetadata.appData.uniqueId as string,
      newMessage.fileSystemType,
      () => newMessage
    );
  } else {
    invalidateCommunityMessage(
      queryClient,
      communityId,
      newMessage.fileMetadata.appData.uniqueId,
      newMessage.fileSystemType
    );
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
): InfiniteData<
  {
    searchResults: (HomebaseFile<CommunityMessage> | null)[];
    cursorState: string;
    queryTime: number;
    includeMetadataHeader: boolean;
  },
  unknown
> => {
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
    pages: extistingMessages.pages.map((page, index) => {
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

export const removeMessage = (
  queryClient: QueryClient,
  toDeleteMessage: HomebaseFile<unknown> | DeletedHomebaseFile,
  communityId: string
) => {
  const extistingMessages = updateCacheCommunityMessages(
    queryClient,
    communityId,
    toDeleteMessage.fileMetadata.appData.groupId,
    undefined,
    (data) => {
      return internalRemoveMessage(
        data,
        toDeleteMessage as HomebaseFile<CommunityMessage> | DeletedHomebaseFile
      );
    }
  );

  if (!extistingMessages) {
    invalidateCommunityMessages(
      queryClient,
      communityId,
      toDeleteMessage.fileMetadata.appData.groupId
    );
  }
};

const internalRemoveMessage = (
  extistingMessages: InfiniteData<
    {
      searchResults: (HomebaseFile<CommunityMessage> | null)[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    },
    unknown
  >,
  toDeleteMessage: HomebaseFile<unknown> | DeletedHomebaseFile
) => {
  return {
    ...extistingMessages,
    pages: extistingMessages.pages.map((page) => {
      return {
        ...page,
        searchResults: page.searchResults.filter(
          (msg) =>
            !msg ||
            !stringGuidsEqual(msg.fileId, toDeleteMessage.fileId) ||
            !stringGuidsEqual(
              msg.fileMetadata.appData.uniqueId,
              toDeleteMessage.fileMetadata.appData.uniqueId
            ) ||
            !stringGuidsEqual(
              msg.fileMetadata.globalTransitId,
              toDeleteMessage.fileMetadata.globalTransitId
            )
        ),
      };
    }),
  };
};
//

export const increaseCommentCountForMessage = (
  queryClient: QueryClient,
  community: HomebaseFile<CommunityDefinition>,
  origin: HomebaseFile<CommunityMessage>
) => {
  const updatedOrigin = { ...origin };
  if (!updatedOrigin.fileMetadata.reactionPreview) {
    updatedOrigin.fileMetadata.reactionPreview = {
      totalCommentCount: 0,
      comments: [],
      reactions: {},
    };
  }
  updatedOrigin.fileMetadata.reactionPreview.totalCommentCount += 1;

  return insertNewMessage(
    queryClient,
    updatedOrigin,
    community.fileMetadata.appData.uniqueId as string
  );
};
