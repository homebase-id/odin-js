import { getMailConversations } from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 100;
export const useMailConversations = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchMailConversations = async (cursorState: string | undefined) => {
    const mailConversationResult = await getMailConversations(dotYouClient, cursorState, PAGE_SIZE);
    return {
      ...mailConversationResult,
      //results: mailConversationResult.results.filter((mail) => !!mail.fileMetadata.senderOdinId),
    };
  };

  return {
    mails: useInfiniteQuery({
      queryKey: ['mail-conversations'],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMailConversations(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
    }),
  };
};
