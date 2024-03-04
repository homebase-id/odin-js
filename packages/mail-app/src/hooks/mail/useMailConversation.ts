import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
  deleteFile,
} from '@youfoundation/js-lib/core';
import { getNewId, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { NewMediaFile } from '@youfoundation/js-lib/public';
import {
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailConversationsReturn,
  MailDrive,
  MailThreadReturn,
  getMailConversation,
  updateLocalMailHeader,
  uploadMail,
} from '../../providers/MailProvider';

export const useMailConversation = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const sendMessage = async ({
    conversation,
    files,
  }: {
    conversation: NewDriveSearchResult<MailConversation> | DriveSearchResult<MailConversation>;
    files?: NewMediaFile[];
  }): Promise<NewDriveSearchResult<MailConversation> | null> => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const uniqueId = conversation.fileMetadata.appData.uniqueId || getNewId();
    const threadId = conversationContent.threadId || getNewId();
    const originId = conversationContent.originId || getNewId();

    const newMailConversation: NewDriveSearchResult<MailConversation> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: {
          uniqueId: uniqueId,
          groupId: threadId,
          content: {
            ...conversationContent,
            originId: originId,
            threadId: threadId,
          },
          userDate: new Date().getTime(),
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadMail(dotYouClient, newMailConversation, files);
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newMailConversation.fileId = uploadResult.file.fileId;
    newMailConversation.fileMetadata.versionTag = uploadResult.newVersionTag;
    newMailConversation.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

    return newMailConversation;
  };

  const markAsRead = async ({
    mailConversations,
  }: {
    mailConversations: DriveSearchResult<MailConversation>[];
  }) => {
    const messagesToMarkAsRead = mailConversations.filter(
      (msg) => msg && msg.fileMetadata.senderOdinId && !msg.fileMetadata.appData.content.isRead
    );

    await Promise.all(
      messagesToMarkAsRead.map(async (conversation) => {
        const updatedConversation: DriveSearchResult<MailConversation> = {
          ...conversation,
          fileMetadata: {
            ...conversation.fileMetadata,
            appData: {
              ...conversation.fileMetadata.appData,
              content: {
                ...conversation.fileMetadata.appData.content,
                sender:
                  conversation.fileMetadata.senderOdinId ||
                  conversation.fileMetadata.appData.content.sender,
                isRead: true,
              },
            },
          },
        };
        return await updateLocalMailHeader(dotYouClient, updatedConversation);
      })
    );
  };

  return {
    send: useMutation({
      mutationFn: sendMessage,

      onMutate: async ({ conversation }) => {
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
                  results:
                    existingConversations.pages.length === 0
                      ? [
                          conversation as DriveSearchResult<MailConversation>,
                          ...(existingConversations?.pages[0].results || []),
                        ]
                      : page.results,
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        const threadId = conversation.fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);

        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: existingMailThread.pages.map((page, index) => {
              return {
                ...page,
                results:
                  existingMailThread.pages.length - 1 === index
                    ? [
                        ...(existingMailThread.pages[0].results || []),
                        conversation as DriveSearchResult<MailConversation>,
                      ]
                    : page.results,
              };
            }),
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }

        return { existingConversations, existingMailThread };
      },
      onError: (_error, { conversation }, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = conversation.fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

        console.error('Error sending chat message', _error);
      },
      onSettled: async () => {
        // Should we fully refetch the mail conversations and mail thread? Might be a lot of data...
      },
    }),
    markAsRead: useMutation({
      mutationFn: markAsRead,
      onMutate: async ({ mailConversations }) => {
        //
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
                    return mailConversations.some((msg) =>
                      stringGuidsEqual(msg.fileId, conversation.fileId)
                    )
                      ? {
                          ...conversation,
                          fileMetadata: {
                            ...conversation.fileMetadata,
                            appData: {
                              ...conversation.fileMetadata.appData,
                              content: {
                                ...conversation.fileMetadata.appData.content,
                                isRead: true,
                              },
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
        const threadId = mailConversations[0].fileMetadata.appData.content.threadId;
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
                  return mailConversations.some((msg) =>
                    stringGuidsEqual(msg.fileId, conversation.fileId)
                  )
                    ? {
                        ...conversation,
                        fileMetadata: {
                          ...conversation.fileMetadata,
                          appData: {
                            ...conversation.fileMetadata.appData,
                            content: {
                              ...conversation.fileMetadata.appData.content,
                              isRead: true,
                            },
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
      onError: (_error, { mailConversations }, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = mailConversations[0].fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

        console.error('Error sending chat message', _error);
      },
    }),
  };
};

export const useMailDraft = (props?: { draftFileId: string }) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const { draftFileId } = props || {};

  const saveDraft = async ({
    conversation,
    files,
  }: {
    conversation: NewDriveSearchResult<MailConversation>;
    files?: NewMediaFile[];
  }): Promise<NewDriveSearchResult<MailConversation> | null> => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const uniqueId = conversation.fileMetadata.appData.uniqueId || getNewId();
    const threadId = conversationContent.threadId || getNewId();
    const originId = conversationContent.originId || getNewId();

    const newMailConversation: NewDriveSearchResult<MailConversation> = {
      fileMetadata: {
        appData: {
          uniqueId: uniqueId,
          groupId: threadId,
          content: {
            ...conversationContent,
            originId: originId,
            threadId: threadId,
          },
          userDate: new Date().getTime(),
          fileType: MAIL_DRAFT_CONVERSATION_FILE_TYPE,
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadMail(dotYouClient, newMailConversation, files);
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newMailConversation.fileId = uploadResult.file.fileId;
    newMailConversation.fileMetadata.versionTag = uploadResult.newVersionTag;
    newMailConversation.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

    return newMailConversation;
  };

  const getDraft = async (fileId: string) => {
    return await getMailConversation(dotYouClient, fileId);
  };

  const removeDraft = async (draftConversation: DriveSearchResult<MailConversation>) => {
    return deleteFile(dotYouClient, MailDrive, draftConversation.fileId);
  };

  return {
    getDraft: useQuery({
      queryKey: ['mail-draft', draftFileId],
      queryFn: () => getDraft(draftFileId as string),
      enabled: !!draftFileId,
    }),
    saveDraft: useMutation({
      mutationFn: saveDraft,
      onMutate: async ({ conversation }) => {
        const draftedConversation = { ...conversation };
        draftedConversation.fileMetadata.appData.fileType = MAIL_DRAFT_CONVERSATION_FILE_TYPE;
        console.log('draftedConversation', draftedConversation);

        const existingConversations = queryClient.getQueryData<
          InfiniteData<MailConversationsReturn>
        >(['mail-conversations']);

        if (existingConversations) {
          const newConversations: InfiniteData<MailConversationsReturn> = {
            ...existingConversations,
            pages: [
              ...existingConversations.pages.map((page, index) => {
                return {
                  ...page,
                  results:
                    index === 0
                      ? [
                          draftedConversation as DriveSearchResult<MailConversation>,
                          ...(existingConversations?.pages[0].results || []),
                        ]
                      : page.results,
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        const threadId = draftedConversation.fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);

        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: existingMailThread.pages.map((page, index) => {
              return {
                ...page,
                results:
                  existingMailThread.pages.length - 1 === index
                    ? [
                        ...(existingMailThread.pages[0].results || []),
                        draftedConversation as DriveSearchResult<MailConversation>,
                      ]
                    : page.results,
              };
            }),
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }

        return { existingConversations, existingMailThread };
      },
      onError: (_error, { conversation }, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = conversation.fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

        console.error('Error saving draft chat message', _error);
      },
      onSettled: async () => {
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
        // Should we fully refetch the mail conversations and mail thread? Might be a lot of data...
      },
    }),
    removeDraft: useMutation({
      mutationFn: removeDraft,
      onMutate: async (draftMailConversation) => {
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
                  results: page.results.filter(
                    (result) => !stringGuidsEqual(result.fileId, draftMailConversation.fileId)
                  ),
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        const threadId = draftMailConversation.fileMetadata.appData.content.threadId;
        const existingMailThread = queryClient.getQueryData<InfiniteData<MailThreadReturn>>([
          'mail-thread',
          threadId,
        ]);

        if (existingMailThread && threadId) {
          const newMailThread: InfiniteData<MailThreadReturn> = {
            ...existingMailThread,
            pages: existingMailThread.pages.map((page, index) => {
              return {
                ...page,
                results: page.results.filter(
                  (result) => !stringGuidsEqual(result.fileId, draftMailConversation.fileId)
                ),
              };
            }),
          };

          queryClient.setQueryData(['mail-thread', threadId], newMailThread);
        }

        return { existingConversations, existingMailThread };
      },
      onError: (_error, draftConversation, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        const threadId = draftConversation.fileMetadata.appData.content.threadId;
        queryClient.setQueryData(['mail-thread', threadId], context?.existingMailThread);

        console.error('Error removing draft chat message', _error);
      },
      onSettled: async () => {
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
        // Should we fully refetch the mail conversations and mail thread? Might be a lot of data...
      },
    }),
  };
};
