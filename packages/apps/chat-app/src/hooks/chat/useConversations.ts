import {
  ConversationMetadata,
  UnifiedConversation,
  getConversations,
} from '../../providers/ConversationProvider';
import { InfiniteData, QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { invalidateConversation, updateCacheConversation } from './useConversation';

export interface ChatConversationsReturn {
  searchResults: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}

const PAGE_SIZE = 500;
export const useConversations = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchConversations = async (
    cursorState: string | undefined
  ): Promise<ChatConversationsReturn | null> =>
    await getConversations(dotYouClient, cursorState, PAGE_SIZE);

  return {
    all: useInfiniteQuery({
      queryKey: ['conversations'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchConversations(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage?.searchResults && lastPage.searchResults?.length >= PAGE_SIZE
          ? lastPage.cursorState
          : undefined,
      staleTime: 1000 * 60 * 5, // 5min before new conversations from another device are fetched on this one
    }),
  };
};

export const insertNewConversation = (
  queryClient: QueryClient,
  newConversation: HomebaseFile<UnifiedConversation, ConversationMetadata>,
  isUpdate?: boolean
) => {
  const extistingConversations = updateCacheConversations(queryClient, (data) => {
    const isNewFile =
      isUpdate === undefined
        ? !data.pages.some((page) =>
            page.searchResults.some((msg) => stringGuidsEqual(msg?.fileId, newConversation.fileId))
          )
        : !isUpdate;

    return {
      ...data,
      pages: data.pages.map((page, index) => ({
        ...page,
        searchResults: isNewFile
          ? index === 0
            ? [
                newConversation,
                // There shouldn't be any duplicates for a fileAdded, but just in case
                ...page.searchResults.filter(
                  (msg) => !stringGuidsEqual(msg?.fileId, newConversation.fileId)
                ),
              ].sort((a, b) => b.fileMetadata.created - a.fileMetadata.created) // Re-sort the first page, as the new message might be older than the first message in the page;
            : page.searchResults.filter(
                (msg) => !stringGuidsEqual(msg?.fileId, newConversation.fileId)
              ) // There shouldn't be any duplicates for a fileAdded, but just in case
          : page.searchResults.map((conversation) =>
              stringGuidsEqual(
                conversation.fileMetadata.appData.uniqueId,
                newConversation.fileMetadata.appData.uniqueId
              )
                ? newConversation
                : conversation
            ),
      })),
    };
  });

  if (!extistingConversations) invalidateConversations(queryClient);

  const existingConversation = updateCacheConversation(
    queryClient,
    newConversation.fileMetadata.appData.uniqueId as string,
    () => newConversation
  );
  if (!existingConversation) {
    invalidateConversation(queryClient, newConversation.fileMetadata.appData.uniqueId);
  }
};

export const invalidateConversations = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
};

export const updateCacheConversations = (
  queryClient: QueryClient,
  transformFn: (
    data: InfiniteData<{
      searchResults: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  ) =>
    | InfiniteData<{
        searchResults: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
        cursorState: string;
        queryTime: number;
        includeMetadataHeader: boolean;
      }>
    | undefined
) => {
  const existingConversations = queryClient.getQueryData<
    InfiniteData<{
      searchResults: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['conversations']);

  if (!existingConversations || !existingConversations?.pages?.length) return;

  const newData = transformFn(existingConversations);
  if (!newData) return;

  queryClient.setQueryData(['conversations'], newData);
  return existingConversations;
};
