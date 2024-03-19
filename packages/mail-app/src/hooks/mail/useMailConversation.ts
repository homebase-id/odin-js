import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import {
  ContentType,
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
  deleteFile,
  getPayloadBytes,
} from '@youfoundation/js-lib/core';
import { getNewId, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { MediaFile, NewMediaFile } from '@youfoundation/js-lib/public';
import {
  MAIL_CONVERSATION_FILE_TYPE,
  MAIL_DRAFT_CONVERSATION_FILE_TYPE,
  MailConversation,
  MailConversationsReturn,
  MailDrive,
  getMailConversation,
  updateLocalMailHeader,
  uploadMail,
} from '../../providers/MailProvider';

export const useMailConversation = (props?: { messageFileId: string }) => {
  const { messageFileId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const identity = dotYouClient.getIdentity();

  const getMessage = async (messageFileId: string) =>
    await getMailConversation(dotYouClient, messageFileId);

  const sendMessage = async ({
    conversation,
    files,
  }: {
    conversation: NewDriveSearchResult<MailConversation> | DriveSearchResult<MailConversation>;
    files?: (NewMediaFile | MediaFile)[] | undefined;
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
          ...conversation.fileMetadata.appData,
          uniqueId: uniqueId,
          groupId: threadId,
          fileType: MAIL_CONVERSATION_FILE_TYPE,
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

    newMailConversation.fileId =
      'file' in uploadResult ? uploadResult.file.fileId : conversation.fileId;
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
      (msg) =>
        msg &&
        identity !== (msg.fileMetadata.senderOdinId || msg.fileMetadata.appData.content.sender) &&
        !msg.fileMetadata.appData.content.isRead
    );

    const uploadResults = await Promise.all(
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
        return await updateLocalMailHeader(dotYouClient, updatedConversation, async () => {
          const serverData = await getMailConversation(dotYouClient, conversation.fileId);
          if (!serverData) return;
          updatedConversation.fileMetadata.versionTag = serverData.fileMetadata.versionTag;
          await updateLocalMailHeader(dotYouClient, updatedConversation);
          console.log('saved after a versionConflict');
        });
      })
    );

    return uploadResults;
  };

  const markAsUnread = async ({
    mailConversations,
  }: {
    mailConversations: DriveSearchResult<MailConversation>[];
  }) => {
    const messagesToMarkAsUnread = mailConversations.filter(
      (msg) =>
        msg &&
        identity !== (msg.fileMetadata.senderOdinId || msg.fileMetadata.appData.content.sender) &&
        msg.fileMetadata.appData.content.isRead
    );

    const uploadResults = await Promise.all(
      messagesToMarkAsUnread.map(async (conversation) => {
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
                isRead: false,
              },
            },
          },
        };
        return await updateLocalMailHeader(dotYouClient, updatedConversation, async () => {
          const serverData = await getMailConversation(dotYouClient, conversation.fileId);
          if (!serverData) return;
          updatedConversation.fileMetadata.versionTag = serverData.fileMetadata.versionTag;
          await updateLocalMailHeader(dotYouClient, updatedConversation);
          console.log('saved after a versionConflict');
        });
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
              ...existingConversations.pages.map((page) => {
                return {
                  ...page,
                  results:
                    existingConversations.pages.length === 0
                      ? [
                          conversation as DriveSearchResult<MailConversation>,
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
      onSettled: async () => {
        // Should we fully refetch the mail conversations and mail thread? Might be a lot of data...
      },
    }),
    // TODO: Use new versionTag that comes follows the update for the cached data...
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
    // TODO: Use new versionTag that comes follows the update for the cached data...
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
    conversation: NewDriveSearchResult<MailConversation>;
    files?: (NewMediaFile | MediaFile)[] | undefined;
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

    newMailConversation.fileId =
      'file' in uploadResult ? uploadResult.file.fileId : conversation.fileId;
    newMailConversation.fileMetadata.versionTag = uploadResult.newVersionTag;
    newMailConversation.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

    return newMailConversation;
  };

  const getDraft = async (fileId: string) => await getMailConversation(dotYouClient, fileId);

  const removeDraft = async (draftConversation: DriveSearchResult<MailConversation>) =>
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
                          draftedConversation as DriveSearchResult<MailConversation>,
                          ...(existingConversations?.pages[0].results || []),
                        ]
                      : page.results.map((result) => {
                          return stringGuidsEqual(result.fileId, draftedConversation.fileId)
                            ? (draftedConversation as DriveSearchResult<MailConversation>)
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

        console.error('Error saving draft chat message', _error);
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

        console.error('Error removing draft chat message', _error);
      },
      onSettled: async () => {
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
        // Should we fully refetch the mail conversations and mail thread? Might be a lot of data...
      },
    }),
  };
};

export const useMailAttachment = () => {
  const dotYouClient = useDotYouClientContext();
  const fetchAttachment = async (fileId: string, key: string, contentType: ContentType) => {
    if (!fileId || !key) return null;

    const payload = await getPayloadBytes(dotYouClient, MailDrive, fileId, key);
    if (!payload) return null;

    return window.URL.createObjectURL(
      new Blob([payload.bytes], {
        type: `${contentType};charset=utf-8`,
      })
    );
  };

  return { fetchAttachment };
};
