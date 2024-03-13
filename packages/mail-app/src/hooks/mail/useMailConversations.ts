import { getMailConversations } from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 100;
export const useMailConversations = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchMailConversations = async (cursorState: string | undefined) => {
    return await getMailConversations(dotYouClient, cursorState, PAGE_SIZE);
  };

  return {
    mails: useInfiniteQuery({
      queryKey: ['mail-conversations'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMailConversations(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),
  };
};
