import { MailConversationsReturn, getMailConversations } from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';

const PAGE_SIZE = 100;
const FIVE_MINUTES = 5 * 60 * 1000;

export const useMailConversations = (
  select?:
    | ((
        data: InfiniteData<MailConversationsReturn, string | undefined>
      ) => InfiniteData<MailConversationsReturn, unknown>)
    | undefined
) => {
  const dotYouClient = useDotYouClientContext();

  const fetchMailConversations = async (cursorState: string | undefined) => {
    return await getMailConversations(dotYouClient, cursorState, undefined, PAGE_SIZE);
  };

  return {
    mails: useInfiniteQuery({
      queryKey: ['mail-conversations'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMailConversations(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      staleTime: FIVE_MINUTES,
      select,
    }),
  };
};