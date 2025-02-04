import {
  InfiniteData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ChatDeliveryStatus, ChatMessage, getChatMessage } from '../../providers/ChatProvider';
import {
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
  NewMediaFile,
  RichText,
} from '@homebase-id/js-lib/core';
import { getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { updateChatMessage, uploadChatMessage } from '../../providers/ChatProvider';

import {
  ConversationMetadata,
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../providers/ConversationProvider';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { insertNewMessage, updateCacheChatMessages } from './useChatMessages';

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
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    replyId?: string;
    files?: NewMediaFile[];
    message: string | RichText;
    linkPreviews?: LinkPreview[];
    chatId?: string;
    userDate?: number;
    tags?: string[];
  }): Promise<NewHomebaseFile<ChatMessage> | null> => {
    const conversationId = conversation.fileMetadata.appData.uniqueId as string;
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getHostIdentity();
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
          requiredSecurityGroup: SecurityGroupType.AutoConnected,
        },
      },
    };

    const messageType =
      message.length > 0
        ? 'a message'
        : linkPreviews && linkPreviews?.length > 0
          ? '🔗 a link'
          : files && files?.length > 1
            ? '📸 media'
            : files?.some((file) => file.file.type.startsWith('image'))
              ? 'a 📷 photo'
              : files?.some((file) => file.file.type.startsWith('audio'))
                ? 'an 🎵 audio file'
                : files?.some((file) => file.file.type.startsWith('video'))
                  ? 'a 🎥 video file'
                  : 'a 📄 file';

    const uploadResult = await uploadChatMessage(
      dotYouClient,
      newChat,
      recipients,
      files,
      linkPreviews,
      recipients.length > 1
        ? conversationContent.title
          ? `${identity} sent ${messageType} to ${conversationContent.title}`
          : `${identity} sent ${messageType} in a group chat`
        : `${identity} sent ${messageType}`
    );
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newChat.fileId = uploadResult.file.fileId;
    newChat.fileMetadata.versionTag = uploadResult.newVersionTag;
    newChat.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;
    newChat.fileMetadata.appData.content.deliveryStatus = stringGuidsEqual(
      conversationId,
      ConversationWithYourselfId
    )
      ? ChatDeliveryStatus.Read
      : uploadResult.chatDeliveryStatus || ChatDeliveryStatus.Sent;

    return newChat;
  };

  const updateMessage = async ({
    updatedChatMessage,
    conversation,
  }: {
    updatedChatMessage: HomebaseFile<ChatMessage>;
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const identity = dotYouClient.getHostIdentity();
    const recipients = conversationContent.recipients.filter((recipient) => recipient !== identity);

    await updateChatMessage(dotYouClient, updatedChatMessage, recipients);
  };

  return {
    get: useQuery({
      queryKey: ['chat-message', props?.messageId],
      queryFn: () => getMessageByUniqueId(props?.conversationId, props?.messageId as string),
      enabled: !!props?.messageId,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }),
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({ conversation, replyId, files, message, chatId, userDate, tags }) => {
        const identity = dotYouClient.getLoggedInIdentity();
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
            senderOdinId: identity,
            originalAuthor: identity,
            payloads: files?.map((file) => ({
              contentType: file.file.type,
              pendingFile: file.file,
            })),
          },
          serverMetadata: {
            accessControlList: {
              requiredSecurityGroup: SecurityGroupType.AutoConnected,
            },
          },
        };

        const { extistingMessages } = insertNewMessage(queryClient, newMessageDsr);
        if (!extistingMessages) return;

        return { existingData: extistingMessages };
      },
      onSuccess: async (newMessage, params) => {
        if (!newMessage) return;

        const existingData = updateCacheChatMessages(
          queryClient,
          params.conversation.fileMetadata.appData.uniqueId as string,
          (data) => ({
            ...data,
            pages: data?.pages?.map((page) => ({
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
          })
        );

        return { existingData };
      },
      onError: (err, messageParams, context) => {
        updateCacheChatMessages(
          queryClient,
          messageParams.conversation.fileMetadata.appData.uniqueId as string,
          () => context?.existingData
        );
      },
    }),
    update: useMutation({
      mutationFn: updateMessage,
      onMutate: async ({ conversation, updatedChatMessage }) => {
        const extistingMessages = updateCacheChatMessages(
          queryClient,
          conversation.fileMetadata.appData.uniqueId as string,
          (data) => ({
            ...data,
            pages: data?.pages?.map((page) => ({
              ...page,
              searchResults: page.searchResults.map((msg) =>
                stringGuidsEqual(msg?.fileId, updatedChatMessage.fileId) ? updatedChatMessage : msg
              ),
            })),
          })
        );

        const existingMessage = updateCacheChatMessage(
          queryClient,
          updatedChatMessage.fileMetadata.appData.uniqueId as string,
          () => updatedChatMessage
        );

        return { extistingMessages, existingMessage };
      },
      onError: (err, messageParams, context) => {
        updateCacheChatMessages(
          queryClient,
          messageParams.conversation.fileMetadata.appData.uniqueId as string,
          () => context?.extistingMessages
        );

        updateCacheChatMessage(
          queryClient,
          messageParams.updatedChatMessage.fileMetadata.appData.uniqueId as string,
          () => context?.existingMessage
        );
      },
    }),
  };
};

export const invalidateChatMessage = (queryClient: QueryClient, messageId: string) => {
  queryClient.invalidateQueries({ queryKey: ['chat-message', messageId] });
};

export const updateCacheChatMessage = (
  queryClient: QueryClient,
  messageId: string,
  transformFn: (
    msg: HomebaseFile<ChatMessage>
  ) => HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage> | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<ChatMessage>>([
    'chat-message',
    messageId,
  ]);
  if (!currentData) return;

  const newData = transformFn(currentData);
  if (!newData) return;

  queryClient.setQueryData(['chat-message', messageId], newData);

  return currentData;
};
