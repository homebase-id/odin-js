import { HomebaseFile, deleteFile } from '@homebase-id/js-lib/core';
import {
  ARCHIVE_ARCHIVAL_STATUS,
  DEFAULT_ARCHIVAL_STATUS,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailConversationsReturn,
  MailDrive,
  REMOVE_ARCHIVAL_STATUS,
  updateMail,
} from '../../providers/MailProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useMailConversations } from './useMailConversations';

export const useMailThread = (props?: { threadId: string | undefined }) => {
  const { threadId } = props || {};
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const removeMailThread = async (mailThread: HomebaseFile<MailConversation>[]) => {
    return await Promise.all(
      mailThread.map((message) => {
        if (message.fileMetadata.appData.fileType === MAIL_DRAFT_CONVERSATION_FILE_TYPE) {
          return deleteFile(dotYouClient, MailDrive, message.fileId);
        }

        const updatedMailMessage = { ...message };
        updatedMailMessage.fileMetadata.appData.archivalStatus = REMOVE_ARCHIVAL_STATUS;
        return updateMail(dotYouClient, message, message.fileMetadata.payloads);
      })
    );
  };

  const archiveMailThread = async (mailThread: HomebaseFile<MailConversation>[]) => {
    return await Promise.all(
      mailThread.map((message) => {
        const updatedMailMessage = { ...message };
        updatedMailMessage.fileMetadata.appData.archivalStatus = ARCHIVE_ARCHIVAL_STATUS;
        return updateMail(dotYouClient, message, message.fileMetadata.payloads);
      })
    );
  };

  const restoreMailThread = async (mailThread: HomebaseFile<MailConversation>[]) => {
    return await Promise.all(
      mailThread.map((message) => {
        const updatedMailMessage = { ...message };
        updatedMailMessage.fileMetadata.appData.archivalStatus = DEFAULT_ARCHIVAL_STATUS;
        return updateMail(dotYouClient, message, message.fileMetadata.payloads);
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
        // TODO: This can be optimized to use the uploadResults to update the versionTag;
        //   Just not sure if it should live here, or be part fo the websocket connection?
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
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
        // TODO: This can be optimized to use the uploadResults to update the versionTag;
        //   Just not sure if it should live here, or be part fo the websocket connection?
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
      },
    }),
  };
};
