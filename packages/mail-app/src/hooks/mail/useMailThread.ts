import { DriveSearchResult, deleteFile } from '@youfoundation/js-lib/core';
import {
  ARCHIVE_ARCHIVAL_STATUS,
  DEFAULT_ARCHIVAL_STATUS,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailConversationsReturn,
  MailDrive,
  REMOVE_ARCHIVAL_STATUS,
  updateLocalMailHeader,
} from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useMailConversations } from './useMailConversations';

export const useMailThread = (props?: { threadId: string | undefined }) => {
  const { threadId } = props || {};
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const removeMailThread = async (mailThread: DriveSearchResult<MailConversation>[]) => {
    return await Promise.all(
      mailThread.map((message) => {
        if (message.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE) {
          return deleteFile(dotYouClient, MailDrive, message.fileId);
        }

        const updatedMailMessage = { ...message };
        updatedMailMessage.fileMetadata.appData.archivalStatus = REMOVE_ARCHIVAL_STATUS;
        return updateLocalMailHeader(dotYouClient, message);
      })
    );
  };

  const archiveMailThread = async (mailThread: DriveSearchResult<MailConversation>[]) => {
    return await Promise.all(
      mailThread.map((message) => {
        const updatedMailMessage = { ...message };
        updatedMailMessage.fileMetadata.appData.archivalStatus = ARCHIVE_ARCHIVAL_STATUS;
        return updateLocalMailHeader(dotYouClient, message);
      })
    );
  };

  const restoreMailThread = async (mailThread: DriveSearchResult<MailConversation>[]) => {
    return await Promise.all(
      mailThread.map((message) => {
        const updatedMailMessage = { ...message };
        updatedMailMessage.fileMetadata.appData.archivalStatus = DEFAULT_ARCHIVAL_STATUS;
        return updateLocalMailHeader(dotYouClient, message);
      })
    );
  };

  return {
    // Filters the mail conversations by their threadId without affecting the query cache
    fetch: useMailConversations((data) => {
      return {
        ...data,
        pages: data.pages.map((page) => {
          return {
            ...page,
            results: page.results.filter((conversation) => {
              return stringGuidsEqual(conversation.fileMetadata.appData.groupId, threadId);
            }),
          };
        }),
      };
    }).mails,
    remove: useMutation({
      mutationFn: removeMailThread,
      onMutate: (mailThread) => {
        const existingConversations = queryClient.getQueryData<
          InfiniteData<MailConversationsReturn>
        >(['mail-conversations']);

        if (existingConversations) {
          const newConversations: InfiniteData<MailConversationsReturn> = {
            ...existingConversations,
            pages: [
              ...existingConversations.pages.map((page) => {
                return {
                  ...page,
                  results: page.results.map((conversation) => {
                    return mailThread.some((msg) =>
                      stringGuidsEqual(msg.fileId, conversation.fileId)
                    )
                      ? {
                          ...conversation,
                          fileMetadata: {
                            ...conversation.fileMetadata,
                            appData: {
                              ...conversation.fileMetadata.appData,
                              archivalStatus: REMOVE_ARCHIVAL_STATUS,
                            },
                          },
                        }
                      : conversation;
                  }),
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        return { existingConversations };
      },
      onError: (error, mailThread, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        console.error('Error removing messages', error);
      },
      onSettled: () => {
        //
      },
    }),
    archive: useMutation({
      mutationFn: archiveMailThread,
      onMutate: (mailThread) => {
        const existingConversations = queryClient.getQueryData<
          InfiniteData<MailConversationsReturn>
        >(['mail-conversations']);

        if (existingConversations) {
          const newConversations: InfiniteData<MailConversationsReturn> = {
            ...existingConversations,
            pages: [
              ...existingConversations.pages.map((page) => {
                return {
                  ...page,
                  results: page.results.map((conversation) => {
                    return mailThread.some((msg) =>
                      stringGuidsEqual(msg.fileId, conversation.fileId)
                    )
                      ? {
                          ...conversation,
                          fileMetadata: {
                            ...conversation.fileMetadata,
                            appData: {
                              ...conversation.fileMetadata.appData,
                              archivalStatus: ARCHIVE_ARCHIVAL_STATUS,
                            },
                          },
                        }
                      : conversation;
                  }),
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        return { existingConversations };
      },
      onError: (error, mailThread, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        console.error('Error archiving messages', error);
      },
      onSettled: () => {
        //
      },
    }),
    restore: useMutation({
      mutationFn: restoreMailThread,
      onMutate: (mailThread) => {
        const existingConversations = queryClient.getQueryData<
          InfiniteData<MailConversationsReturn>
        >(['mail-conversations']);

        if (existingConversations) {
          const newConversations: InfiniteData<MailConversationsReturn> = {
            ...existingConversations,
            pages: [
              ...existingConversations.pages.map((page) => {
                return {
                  ...page,
                  results: page.results.map((conversation) => {
                    return mailThread.some((msg) =>
                      stringGuidsEqual(msg.fileId, conversation.fileId)
                    )
                      ? {
                          ...conversation,
                          fileMetadata: {
                            ...conversation.fileMetadata,
                            appData: {
                              ...conversation.fileMetadata.appData,
                              archivalStatus: DEFAULT_ARCHIVAL_STATUS,
                            },
                          },
                        }
                      : conversation;
                  }),
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        return { existingConversations };
      },
      onError: (error, mailThread, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        console.error('Error restoring messages', error);
      },
      onSettled: () => {
        //
      },
    }),
  };
};