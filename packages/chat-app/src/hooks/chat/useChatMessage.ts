import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatDeliveryStatus, ChatMessage, getChatMessage } from '../../providers/ChatProvider';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
} from '@youfoundation/js-lib/core';
import { getNewId, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { updateChatMessage, uploadChatMessage } from '../../providers/ChatProvider';

import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import {
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../providers/ConversationProvider';

export const useChatMessage = (props?: { messageId: string | undefined }) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getMessageByUniqueId = async (messageId: string) => {
    // TODO: Improve by fetching the message from the cache on conversations first
    return await getChatMessage(dotYouClient, messageId);
  };

  const sendMessage = async ({
    conversation,
    replyId,
    files,
    message,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
    replyId?: string;
    files?: NewMediaFile[];
    message: string;
  }): Promise<NewHomebaseFile<ChatMessage> | null> => {
    const conversationId = conversation.fileMetadata.appData.uniqueId as string;
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    const newChatId = getNewId();
    const newChat: NewHomebaseFile<ChatMessage> = {
      fileMetadata: {
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
          userDate: new Date().getTime(),
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadChatMessage(dotYouClient, newChat, recipients, files);
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newChat.fileId = uploadResult.file.fileId;
    newChat.fileMetadata.versionTag = uploadResult.newVersionTag;
    newChat.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;

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
      queryFn: () => getMessageByUniqueId(props?.messageId as string),
      enabled: !!props?.messageId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }),
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({ conversation, replyId, files, message }) => {
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
            appData: {
              groupId: conversation.fileMetadata.appData.uniqueId,
              content: {
                message: message,
                deliveryStatus: ChatDeliveryStatus.Sending,
                replyId: replyId,
              },
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
      onError: (err, messageParams, context) => {
        queryClient.setQueryData(
          ['chat-messages', messageParams.conversation.fileMetadata.appData.uniqueId],
          context?.existingData
        );
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-messages', variables.conversation.fileMetadata.appData.uniqueId],
        });
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
