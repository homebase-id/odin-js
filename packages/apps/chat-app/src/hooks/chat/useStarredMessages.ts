import { OdinClient, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  QueryClient,
  UndefinedInitialDataInfiniteOptions,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { ChatMessage, getStarredChatMessages } from '../../providers/ChatProvider';
import { useOdinClientContext } from '@homebase-id/common-app';

const FIRST_PAGE_SIZE = 100;
const PAGE_SIZE = 100;
const fetchMessages = async (
  odinClient: OdinClient,

  cursorState: string | undefined
) => {
  return await getStarredChatMessages(
    odinClient,
    cursorState,
    cursorState ? PAGE_SIZE : FIRST_PAGE_SIZE
  );
};

const getStarredChatMessageInfiniteQueryOptions: (
  odinClient: OdinClient
) => UndefinedInitialDataInfiniteOptions<{
  searchResults: (HomebaseFile<ChatMessage> | null)[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> = (odinClient) => ({
  queryKey: ['starred-chat-messages'],
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam }) => fetchMessages(odinClient, pageParam as string | undefined),
  getNextPageParam: (lastPage, pages) =>
    lastPage &&
      lastPage.searchResults?.length >= (lastPage === pages[0] ? FIRST_PAGE_SIZE : PAGE_SIZE)
      ? lastPage.cursorState
      : undefined,

  staleTime: 1000 * 60 * 5, // 5 minutes
});

export const useStarredMessages = () => {
  const odinClient = useOdinClientContext();
  return {
    all: useInfiniteQuery(getStarredChatMessageInfiniteQueryOptions(odinClient)),
  };
};

export const invalidateStarredMessages = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['starred-chat-messages'] });
};
