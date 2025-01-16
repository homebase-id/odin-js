import { DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { UndefinedInitialDataInfiniteOptions, useInfiniteQuery } from '@tanstack/react-query';
import { ChatMessage, getStarredChatMessages } from '../../providers/ChatProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';

const FIRST_PAGE_SIZE = 100;
const PAGE_SIZE = 100;
const fetchMessages = async (
  dotYouClient: DotYouClient,

  cursorState: string | undefined
) => {
  return await getStarredChatMessages(
    dotYouClient,
    cursorState,
    cursorState ? PAGE_SIZE : FIRST_PAGE_SIZE
  );
};

const getStarredChatMessageInfiniteQueryOptions: (
  dotYouClient: DotYouClient
) => UndefinedInitialDataInfiniteOptions<{
  searchResults: (HomebaseFile<ChatMessage> | null)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> = (dotYouClient) => ({
  queryKey: ['starred-chat-messages'],
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) => fetchMessages(dotYouClient, pageParam as string | undefined),
  getNextPageParam: (lastPage, pages) =>
    lastPage &&
    lastPage.searchResults?.length >= (lastPage === pages[0] ? FIRST_PAGE_SIZE : PAGE_SIZE)
      ? lastPage.cursorState
      : undefined,

  staleTime: 1000 * 60, // 1 minute
});

export const useStarredMessages = () => {
  const dotYouClient = useDotYouClientContext();
  return {
    all: useInfiniteQuery(getStarredChatMessageInfiniteQueryOptions(dotYouClient)),
  };
};
