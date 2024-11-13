import { UnifiedConversation, getConversations } from '../../providers/ConversationProvider';
import { InfiniteData, QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export interface ChatConversationsReturn {
  searchResults: HomebaseFile<UnifiedConversation>[];
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
  newConversation: HomebaseFile<UnifiedConversation>,
  isUpdate?: boolean
) => {
  const extistingConversations = queryClient.getQueryData<
    InfiniteData<{
      searchResults: HomebaseFile<UnifiedConversation>[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['conversations']);

  if (extistingConversations) {
    const isNewFile =
      isUpdate === undefined
        ? !extistingConversations.pages.some((page) =>
            page.searchResults.some((msg) => stringGuidsEqual(msg?.fileId, newConversation.fileId))
          )
        : !isUpdate;

    const newData = {
      ...extistingConversations,
      pages: extistingConversations.pages.map((page, index) => ({
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
    queryClient.setQueryData(['conversations'], newData);
  } else {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  const extistingConversation = queryClient.getQueryData<HomebaseFile<UnifiedConversation>>([
    'conversation',
    newConversation.fileMetadata.appData.uniqueId,
  ]);
  if (extistingConversation) {
    queryClient.setQueryData(
      ['conversation', newConversation.fileMetadata.appData.uniqueId],
      newConversation
    );
  } else {
    queryClient.invalidateQueries({
      queryKey: ['conversation', newConversation.fileMetadata.appData.uniqueId],
    });
  }
};
