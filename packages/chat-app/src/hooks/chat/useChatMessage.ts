import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatDeliveryStatus, ChatMessage, getChatMessage } from '../../providers/ChatProvider';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
} from '@homebase-id/js-lib/core';
import { getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { updateChatMessage, uploadChatMessage } from '../../providers/ChatProvider';

import {
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../providers/ConversationProvider';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useChatMessage = (props?: {
  conversationId?: string | undefined; // Optional: if we have it we can use the cache
  messageId: string | undefined;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getMessageByUniqueId = async (conversationId: string | undefined, messageId: string) => {
    const extistingMessages = conversationId
      ? queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<ChatMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >(['chat-messages', conversationId])
      : undefined;

    if (extistingMessages) {
      const message = extistingMessages.pages
        .flatMap((page) => page.searchResults)
        .find((msg) => stringGuidsEqual(msg?.fileMetadata.appData.uniqueId, messageId));

      if (message) {
        return message;
      }
    }

    return await getChatMessage(dotYouClient, messageId);
  };

  const sendMessage = async ({
    conversation,
    replyId,
    files,
    message,
    linkPreviews,
    chatId,
    userDate,
    tags,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    replyId?: string;
    files?: NewMediaFile[];
    message: string;
    linkPreviews?: LinkPreview[];
    chatId?: string;
    userDate?: number;
    tags?: string[];
  }): Promise<NewHomebaseFile<ChatMessage> | null> => {
    const conversationId = conversation.fileMetadata.appData.uniqueId as string;
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    // We prefer having the uniqueId set outside of the mutation, so that an auto-retry of the mutation doesn't create duplicates
    const newChatId = chatId || getNewId();
    const newChat: NewHomebaseFile<ChatMessage> = {
      fileMetadata: {
        created: userDate,
        appData: {
          uniqueId: newChatId,
          groupId: conversationId,
          content: {
            message: message,
            deliveryStatus: stringGuidsEqual(conversationId, ConversationWithYourselfId)
              ? ChatDeliveryStatus.Read
              : ChatDeliveryStatus.Sent,
            replyId: replyId,
          },
          userDate: userDate || new Date().getTime(),
          tags,
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadChatMessage(
      dotYouClient,
      newChat,
      recipients,
      files,
      linkPreviews
    );
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newChat.fileId = uploadResult.file.fileId;
    newChat.fileMetadata.versionTag = uploadResult.newVersionTag;
    newChat.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;
    newChat.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Sent;

    return newChat;
  };

  const updateMessage = async ({
    updatedChatMessage,
    conversation,
  }: {
    updatedChatMessage: HomebaseFile<ChatMessage>;
    conversation: HomebaseFile<UnifiedConversation>;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    await updateChatMessage(dotYouClient, updatedChatMessage, recipients);
  };

  return {
    get: useQuery({
      queryKey: ['chat-message', props?.messageId],
      queryFn: () => getMessageByUniqueId(props?.conversationId, props?.messageId as string),
      enabled: !!props?.messageId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }),
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({ conversation, replyId, files, message, chatId, userDate, tags }) => {
        const existingData = queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<ChatMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >(['chat-messages', conversation.fileMetadata.appData.uniqueId]);

        if (!existingData) return;

        const newMessageDsr: NewHomebaseFile<ChatMessage> = {
          fileMetadata: {
            created: userDate,
            appData: {
              uniqueId: chatId,
              groupId: conversation.fileMetadata.appData.uniqueId,
              content: {
                message: message,
                deliveryStatus: ChatDeliveryStatus.Sending,
                replyId: replyId,
              },
              userDate,
              tags,
            },
            payloads: files?.map((file) => ({
              contentType: file.file.type,
              pendingFile: file.file,
            })),
          },
          serverMetadata: {
            accessControlList: {
              requiredSecurityGroup: SecurityGroupType.Connected,
            },
          },
        };

        const newData = {
          ...existingData,
          pages: existingData?.pages?.map((page, index) => ({
            ...page,
            searchResults:
              index === 0 ? [newMessageDsr, ...page.searchResults] : page.searchResults,
          })),
        };

        queryClient.setQueryData(
          ['chat-messages', conversation.fileMetadata.appData.uniqueId],
          newData
        );
        return { existingData };
      },
      onSuccess: async (newMessage, params) => {
        if (!newMessage) return;
        const extistingMessages = queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<ChatMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >(['chat-messages', params.conversation.fileMetadata.appData.uniqueId]);
        if (extistingMessages) {
          const newData = {
            ...extistingMessages,
            pages: extistingMessages?.pages?.map((page) => ({
              ...page,
              searchResults: page.searchResults.map((msg) => {
                if (
                  stringGuidsEqual(
                    msg?.fileMetadata.appData.uniqueId,
                    newMessage.fileMetadata.appData.uniqueId
                  ) &&
                  (!msg?.fileMetadata.appData.content.deliveryStatus ||
                    msg?.fileMetadata.appData.content.deliveryStatus <= ChatDeliveryStatus.Sent)
                ) {
                  // We want to keep previewThumbnail and payloads from the existing message as that holds the optimistic updates from the onMutate
                  return {
                    ...newMessage,
                    fileMetadata: {
                      ...newMessage.fileMetadata,
                      appData: {
                        ...newMessage.fileMetadata.appData,
                        previewThumbnail: msg?.fileMetadata.appData.previewThumbnail,
                      },
                      payloads: msg?.fileMetadata.payloads,
                    },
                  };
                }

                return msg;
              }),
            })),
          };

          queryClient.setQueryData(
            ['chat-messages', params.conversation.fileMetadata.appData.uniqueId],
            newData
          );
        }
      },
      onError: (err, messageParams, context) => {
        queryClient.setQueryData(
          ['chat-messages', messageParams.conversation.fileMetadata.appData.uniqueId],
          context?.existingData
        );
      },
    }),
    update: useMutation({
      mutationFn: updateMessage,
      onMutate: async ({ conversation, updatedChatMessage }) => {
        // Update chat messages
        const extistingMessages = queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<ChatMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >(['chat-messages', conversation.fileMetadata.appData.uniqueId]);

        if (extistingMessages) {
          const newData = {
            ...extistingMessages,
            pages: extistingMessages?.pages?.map((page) => ({
              ...page,
              searchResults: page.searchResults.map((msg) =>
                stringGuidsEqual(msg?.fileId, updatedChatMessage.fileId) ? updatedChatMessage : msg
              ),
            })),
          };
          queryClient.setQueryData(
            ['chat-messages', conversation.fileMetadata.appData.uniqueId],
            newData
          );
        }

        // Update chat message
        const existingMessage = queryClient.getQueryData<HomebaseFile<ChatMessage>>([
          'chat-message',
          updatedChatMessage.fileMetadata.appData.uniqueId,
        ]);

        if (existingMessage) {
          queryClient.setQueryData(
            ['chat-message', updatedChatMessage.fileMetadata.appData.uniqueId],
            updatedChatMessage
          );
        }

        return { extistingMessages, existingMessage };
      },
      onError: (err, messageParams, context) => {
        queryClient.setQueryData(
          ['chat-messages', messageParams.conversation.fileMetadata.appData.uniqueId],
          context?.extistingMessages
        );

        queryClient.setQueryData(
          ['chat-message', messageParams.updatedChatMessage.fileMetadata.appData.uniqueId],
          context?.existingMessage
        );
      },
    }),
  };
};
