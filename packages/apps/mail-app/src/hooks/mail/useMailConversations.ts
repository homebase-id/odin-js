import { MailConversationsReturn, getMailConversations } from '../../providers/MailProvider';
import { useOdinClientContext } from '@homebase-id/common-app';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';

export const MAIL_CONVERSATIONS_PAGE_SIZE = 100;
export const useMailConversations = (
  select?:
    | ((
      data: InfiniteData<MailConversationsReturn, string | undefined>
    ) => InfiniteData<MailConversationsReturn, unknown>)
    | undefined
) => {
  const odinClient = useOdinClientContext();

  const fetchMailConversations = async (cursorState: string | undefined) => {
    return await getMailConversations(
      odinClient,
      cursorState,
      undefined,
      MAIL_CONVERSATIONS_PAGE_SIZE
    );
  };

  return {
    mails: useInfiniteQuery({
      queryKey: ['mail-conversations'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMailConversations(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= MAIL_CONVERSATIONS_PAGE_SIZE ? lastPage.cursorState : undefined,
      staleTime: 1000, // 1s to avoid duplicate requests on the same page load
      select,
    }),
  };
};
