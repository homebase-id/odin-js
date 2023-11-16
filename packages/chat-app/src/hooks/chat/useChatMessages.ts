import { useDotYouClient } from '@youfoundation/common-app';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getChatMessages } from '../../providers/ChatProvider';

const PAGE_SIZE = 100;
export const useChatMessages = ({ conversationId }: { conversationId: string | undefined }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchMessages = async (conversationId: string, cursorState: string | undefined) => {
    return await getChatMessages(dotYouClient, conversationId, cursorState, PAGE_SIZE);
  };

  return {
    all: useInfiniteQuery({
      queryKey: ['chat', conversationId],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMessages(conversationId as string, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.searchResults?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      enabled: !!conversationId,
    }),
  };
};
