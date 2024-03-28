import { getConversations } from '../../providers/ConversationProvider';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

const PAGE_SIZE = 500;
export const useConversations = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchConversations = async (cursorState: string | undefined) =>
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
    }),
  };
};
