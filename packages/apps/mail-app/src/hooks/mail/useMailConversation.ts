import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t, useDotYouClientContext, useIntroductions } from '@homebase-id/common-app';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  deleteFile,
  MediaFile,
  NewMediaFile,
} from '@homebase-id/js-lib/core';
import { getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  MAIL_CONVERSATION_FILE_TYPE,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailConversationsReturn,
  MailDeliveryStatus,
  MailDrive,
  getMailConversation,
  updateMail,
  uploadMail,
} from '../../providers/MailProvider';

export const useMailConversation = (props?: { messageFileId: string }) => {
  const { messageFileId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const identity = dotYouClient.getHostIdentity();

  const { mutateAsync: introduceRecipients } = useIntroductions().introduceIdentities;

  const getMessage = async (messageFileId: string) =>
    await getMailConversation(dotYouClient, messageFileId);

  const sendMessage = async ({
    conversation,
    files,
  }: {
    conversation: NewHomebaseFile<MailConversation> | HomebaseFile<MailConversation>;
    files?: (NewMediaFile | MediaFile)[] | undefined;
  }): Promise<HomebaseFile<MailConversation> | null> => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const uniqueId = conversation.fileMetadata.appData.uniqueId || getNewId();
    const threadId = conversationContent.threadId || getNewId();
    const originId = conversationContent.originId || getNewId();

    const newMailConversation: NewHomebaseFile<MailConversation> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: {
          ...conversation.fileMetadata.appData,
          tags: [originId],
          uniqueId: uniqueId,
          groupId: threadId,
          fileType: MAIL_CONVERSATION_FILE_TYPE,
          content: {
            ...conversationContent,
            originId: originId,
            threadId: threadId,
            deliveryStatus: MailDeliveryStatus.Sent,
          },
          userDate: new Date().getTime(),
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.AutoConnected,
        },
      },
    };

    const uploadResult = newMailConversation.fileId
      ? await updateMail(dotYouClient, newMailConversation as HomebaseFile<MailConversation>, files)
      : await uploadMail(dotYouClient, newMailConversation, files as NewMediaFile[]);
    if (!uploadResult) throw new Error('Failed to send the mail message');

    newMailConversation.fileId = uploadResult.file.fileId;
    newMailConversation.fileMetadata.versionTag = uploadResult.newVersionTag;
    newMailConversation.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

    await introduceRecipients({
      message: t('{0} has added you to a mail thread', identity || ''),
      recipients: conversationContent.recipients.filter((recipient) => recipient !== identity),
    });

    return newMailConversation as HomebaseFile<MailConversation>;
  };

  const markAsRead = async ({
    mailConversations,
  }: {
    mailConversations: HomebaseFile<MailConversation>[];
  }) => {
    const messagesToMarkAsRead = mailConversations.filter(
      (msg) =>
        msg &&
        identity !== (msg.fileMetadata.senderOdinId || msg.fileMetadata.appData.content.sender) &&
        !msg.fileMetadata.appData.content.isRead
    );

    const uploadResults = await Promise.all(
      messagesToMarkAsRead.map(async (conversation) => {
        const updatedConversation: HomebaseFile<MailConversation> = {
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
        return await updateMail(
          dotYouClient,
          updatedConversation,
          updatedConversation.fileMetadata.payloads,
          async () => {
            const serverData = await getMailConversation(dotYouClient, conversation.fileId);
            if (!serverData) return;
            updatedConversation.fileMetadata.versionTag = serverData.fileMetadata.versionTag;
            await updateMail(dotYouClient, updatedConversation);
          }
        );
      })
    );

    return uploadResults;
  };

  const markAsUnread = async ({
    mailConversations,
  }: {
    mailConversations: HomebaseFile<MailConversation>[];
  }) => {
    const messagesToMarkAsUnread = mailConversations.filter(
      (msg) =>
        msg &&
        identity !== (msg.fileMetadata.senderOdinId || msg.fileMetadata.appData.content.sender) &&
        msg.fileMetadata.appData.content.isRead
    );

    const uploadResults = await Promise.all(
      messagesToMarkAsUnread.map(async (conversation) => {
        const updatedConversation: HomebaseFile<MailConversation> = {
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
                isRead: false,
              },
            },
          },
        };
        return await updateMail(
          dotYouClient,
          updatedConversation,
          updatedConversation.fileMetadata.payloads,
          async () => {
            const serverData = await getMailConversation(dotYouClient, conversation.fileId);
            if (!serverData) return;
            updatedConversation.fileMetadata.versionTag = serverData.fileMetadata.versionTag;
            await updateMail(
              dotYouClient,
              updatedConversation,
              updatedConversation.fileMetadata.payloads
            );
          }
        );
      })
    );

    return uploadResults;
  };

  return {
    getMessage: useQuery({
      queryKey: ['mail-message', messageFileId || ''],
      queryFn: () => getMessage(messageFileId as string),
      enabled: !!messageFileId,
      staleTime: 1000 * 60 * 60 * 1,
    }),
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
              ...existingConversations.pages.map((page, index) => {
                return {
                  ...page,
                  results:
                    index === 0
                      ? [
                          conversation as HomebaseFile<MailConversation>,
                          ...(existingConversations?.pages[0].results.filter(
                            (item) => !stringGuidsEqual(item.fileId, conversation.fileId)
                          ) || []),
                        ]
                      : page.results,
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        return { existingConversations };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);
        console.error('Error sending mail message', _error);
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

        return { existingConversations };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);
        console.error('Error marking conversation as read', _error);
      },
      onSuccess: (_data) => {
        const mailConversations = queryClient.getQueryData<InfiniteData<MailConversationsReturn>>([
          'mail-conversations',
        ]);
        if (!mailConversations) return;

        const newMailConversations = {
          ...mailConversations,
          pages: mailConversations.pages.map((page) => {
            return {
              ...page,
              results: page.results.map((conversation) => {
                const uploadResult = _data.find(
                  (upload) => upload && stringGuidsEqual(upload.file.fileId, conversation.fileId)
                );
                if (uploadResult) {
                  return {
                    ...conversation,
                    fileMetadata: {
                      ...conversation.fileMetadata,
                      versionTag: uploadResult.newVersionTag,
                    },
                  };
                } else {
                  return conversation;
                }
              }),
            };
          }),
        };

        queryClient.setQueryData(['mail-conversations'], newMailConversations);
      },
    }),
    markAsUnread: useMutation({
      mutationFn: markAsUnread,
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
                                isRead: false,
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

        return { existingConversations };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        console.error('Error marking conversation as unread', _error);
      },
      onSuccess: (_data) => {
        const mailConversations = queryClient.getQueryData<InfiniteData<MailConversationsReturn>>([
          'mail-conversations',
        ]);
        if (!mailConversations) return;

        const newMailConversations = {
          ...mailConversations,
          pages: mailConversations.pages.map((page) => {
            return {
              ...page,
              results: page.results.map((conversation) => {
                const uploadResult = _data.find(
                  (upload) => upload && stringGuidsEqual(upload.file.fileId, conversation.fileId)
                );
                if (uploadResult) {
                  return {
                    ...conversation,
                    fileMetadata: {
                      ...conversation.fileMetadata,
                      versionTag: uploadResult.newVersionTag,
                    },
                  };
                } else {
                  return conversation;
                }
              }),
            };
          }),
        };

        queryClient.setQueryData(['mail-conversations'], newMailConversations);
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
    conversation: NewHomebaseFile<MailConversation>;
    files?: (NewMediaFile | MediaFile)[] | undefined;
  }): Promise<NewHomebaseFile<MailConversation> | null> => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const uniqueId = conversation.fileMetadata.appData.uniqueId || getNewId();
    const threadId = conversationContent.threadId || getNewId();
    const originId = conversationContent.originId || getNewId();

    const newMailConversation: NewHomebaseFile<MailConversation> = {
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
          fileType: MAIL_DRAFT_CONVERSATION_FILE_TYPE,
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.AutoConnected,
        },
      },
    };

    const uploadResult = newMailConversation.fileId
      ? await updateMail(dotYouClient, newMailConversation as HomebaseFile<MailConversation>, files)
      : await uploadMail(dotYouClient, newMailConversation, files as NewMediaFile[]);

    if (!uploadResult) throw new Error('Failed to save the mail message draft');

    newMailConversation.fileId =
      'file' in uploadResult ? uploadResult.file.fileId : conversation.fileId;
    newMailConversation.fileMetadata.versionTag = uploadResult.newVersionTag;
    newMailConversation.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

    return newMailConversation;
  };

  const getDraft = async (fileId: string) => await getMailConversation(dotYouClient, fileId);

  const removeDraft = async (draftConversation: HomebaseFile<MailConversation>) =>
    deleteFile(dotYouClient, MailDrive, draftConversation.fileId);

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

        const alreadyExisted = !!draftedConversation.fileId;

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
                    index === 0 && !alreadyExisted
                      ? [
                          draftedConversation as HomebaseFile<MailConversation>,
                          ...(existingConversations?.pages[0].results || []),
                        ]
                      : page.results.map((result) => {
                          return stringGuidsEqual(result.fileId, draftedConversation.fileId)
                            ? (draftedConversation as HomebaseFile<MailConversation>)
                            : result;
                        }),
                };
              }),
            ],
          };

          queryClient.setQueryData(['mail-conversations'], newConversations);
        }

        return { existingConversations };
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        console.error('Error saving draft mail message', _error);
      },
      onSettled: async () => {
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
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

        return { existingConversations };
      },
      onError: (_error, draftConversation, context) => {
        queryClient.setQueryData(['mail-conversations'], context?.existingConversations);

        console.error('Error removing draft mail message', _error);
      },
    }),
  };
};
