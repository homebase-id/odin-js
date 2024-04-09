import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useMailConversations } from './useMailConversations';

export const useMailOrigin = (props?: {
  originId: string | undefined;
  threadId: string | undefined;
}) => {
  const { originId, threadId } = props || {};
  return {
    // Filters the mail conversations by their originId without affecting the query cache
    fetchOrigin: useMailConversations((data) => {
      return {
        ...data,
        pages: data.pages.map((page) => {
          return {
            ...page,
            results: page.results.filter((conversation) => {
              return (
                stringGuidsEqual(conversation.fileMetadata.appData.content.originId, originId) &&
                !stringGuidsEqual(conversation.fileMetadata.appData.content.threadId, threadId)
              );
            }),
          };
        }),
      };
    }).mails,
  };
};
