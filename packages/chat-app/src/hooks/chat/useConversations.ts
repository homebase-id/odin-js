import { useDotYouClient } from '@youfoundation/common-app';
import { getConversations } from '../../providers/ConversationProvider';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 500;
export const useConversations = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchConversations = async (cursorState: string | undefined) => {
    return await getConversations(dotYouClient, cursorState, PAGE_SIZE);
  };

  return {
    all: useInfiniteQuery({
      queryKey: ['conversations'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchConversations(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.searchResults?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      refetchOnMount: false,
    }),
  };
};
