import { DriveSearchResult, deleteFile } from '@youfoundation/js-lib/core';
import {
  ARCHIVE_ARCHIVAL_STATUS,
  DEFAULT_ARCHIVAL_STATUS,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailConversationsReturn,
  MailDrive,
  MailThreadReturn,
  REMOVE_ARCHIVAL_STATUS,
  getMailThread,
  updateLocalMailHeader,
} from '../../providers/MailProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

const FIVE_MINUTES = 5 * 60 * 1000;
const PAGE_SIZE = 100;

export const useMailThread = (props?: { threadId: string | undefined }) => {
  const { threadId } = props || {};
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const fetchMailConversations = async (threadId: string, cursorState: string | undefined) => {
    return await getMailThread(dotYouClient, threadId, cursorState, PAGE_SIZE);
  };

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
    fetch: useInfiniteQuery({
      queryKey: ['mail-thread', threadId || ''],
      enabled: !!threadId,
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => fetchMailConversations(threadId as string, pageParam),
      getNextPageParam: (lastPage) =>
        lastPage.results?.length >= PAGE_SIZE ? lastPage.cursorState : undefined,
      staleTime: FIVE_MINUTES,
    }),
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

        // This assumes all messages are from the same thread
        const threadId = mailThread[0].fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);
        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: existingMailThread.pages.map((page) => {
              return {
                ...page,
                results: page.results.map((conversation) => {
                  return mailThread.some((msg) => stringGuidsEqual(msg.fileId, conversation.fileId))
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
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }

        return { existingConversations, existingMailThread };
      },
      onError: (error, mailThread, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = mailThread[0].fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

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

        // This assumes all messages are from the same thread
        const threadId = mailThread[0].fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);
        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: existingMailThread.pages.map((page) => {
              return {
                ...page,
                results: page.results.map((conversation) => {
                  return mailThread.some((msg) => stringGuidsEqual(msg.fileId, conversation.fileId))
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
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }

        return { existingConversations, existingMailThread };
      },
      onError: (error, mailThread, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = mailThread[0].fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

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

        // This assumes all messages are from the same thread
        const threadId = mailThread[0].fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);
        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: existingMailThread.pages.map((page) => {
              return {
                ...page,
                results: page.results.map((conversation) => {
                  return mailThread.some((msg) => stringGuidsEqual(msg.fileId, conversation.fileId))
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
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }

        return { existingConversations, existingMailThread };
      },
      onError: (error, mailThread, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = mailThread[0].fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

        console.error('Error restoring messages', error);
      },
      onSettled: () => {
        //
      },
    }),
  };
};
