import { getMailThread } from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 100;
export const useMailThread = ({ threadId }: { threadId: string | undefined }) => {
  const dotYouClient = useDotYouClientContext();

  const fetchMailConversations = async (threadId: string, cursorState: string | undefined) => {
    return await getMailThread(dotYouClient, threadId, cursorState, PAGE_SIZE);
  };

  return {
    thread: useInfiniteQuery({
      queryKey: ['mail-thread', threadId],
      enabled: !!threadId,
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMailConversations(threadId as string, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.searchResults?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
    }),
  };
};
