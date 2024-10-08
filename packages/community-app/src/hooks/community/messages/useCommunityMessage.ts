import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  HomebaseFile,
  NewHomebaseFile,
  NewMediaFile,
  RichText,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import { LinkPreview } from '@homebase-id/js-lib/media';
import {
  CommunityDeliveryStatus,
  CommunityMessage,
  getCommunityMessage,
  updateCommunityMessage,
  uploadCommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { insertNewMessage } from './useCommunityMessages';

export const useCommunityMessage = (props?: {
  communityId: string | undefined;
  messageId: string | undefined;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const identity = dotYouClient.getIdentity();

  const getMessageByUniqueId = async (communityId: string, messageId: string) => {
    // TODO: Improve by fetching the message from the cache on conversations first
    return await getCommunityMessage(dotYouClient, communityId, messageId);
  };

  const sendMessage = async ({
    community,
    channel,
    threadId,
    replyId,
    files,
    message,
    linkPreviews,
    chatId,
    userDate,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    channel: HomebaseFile<CommunityChannel>;
    threadId?: string;
    replyId?: string;
    files?: NewMediaFile[];
    message: RichText | string;
    linkPreviews?: LinkPreview[];
    chatId?: string;
    userDate?: number;
  }): Promise<NewHomebaseFile<CommunityMessage> | null> => {
    const communityId = community.fileMetadata.appData.uniqueId as string;
    const communityContent = community.fileMetadata.appData.content;
    const recipients = communityContent.recipients.filter((recipient) => recipient !== identity);

    // We prefer having the uniqueId set outside of the mutation, so that an auto-retry of the mutation doesn't create duplicates
    const newChatId = chatId || getNewId();
    const newChat: NewHomebaseFile<CommunityMessage> = {
      fileMetadata: {
        created: userDate,
        appData: {
          uniqueId: newChatId,
          groupId: threadId || channel?.fileMetadata.appData.uniqueId,
          content: {
            message: message,
            deliveryStatus: CommunityDeliveryStatus.Sent,
            replyId: replyId,
            channelId: channel.fileMetadata.appData.uniqueId as string,
          },

          userDate: userDate || new Date().getTime(),
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Connected,
        },
      },
    };

    const uploadResult = await uploadCommunityMessage(
      dotYouClient,
      communityId,
      newChat,
      recipients,
      files,
      linkPreviews
    );
    if (!uploadResult) throw new Error('Failed to send the chat message');

    newChat.fileId = uploadResult.file.fileId;
    newChat.fileMetadata.versionTag = uploadResult.newVersionTag;
    newChat.fileMetadata.appData.previewThumbnail = uploadResult.previewThumbnail;
    newChat.fileMetadata.appData.content.deliveryStatus = CommunityDeliveryStatus.Sent;

    return newChat;
  };

  const updateMessage = async ({
    updatedChatMessage,
    community,
  }: {
    updatedChatMessage: HomebaseFile<CommunityMessage>;
    community: HomebaseFile<CommunityDefinition>;
  }) => {
    const communityContent = community.fileMetadata.appData.content;
    const recipients = communityContent.recipients.filter((recipient) => recipient !== identity);

    await updateCommunityMessage(
      dotYouClient,
      community.fileMetadata.appData.uniqueId as string,
      updatedChatMessage,
      recipients
    );
  };

  return {
    get: useQuery({
      queryKey: ['community-message', props?.communityId, props?.messageId],
      queryFn: () => getMessageByUniqueId(props?.communityId as string, props?.messageId as string),
      enabled: !!props?.communityId && !!props?.messageId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }),
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({
        community,
        channel,
        replyId,
        files,
        message,
        chatId,
        threadId,
        userDate,
      }) => {
        const newMessageDsr: NewHomebaseFile<CommunityMessage> = {
          fileMetadata: {
            created: userDate,
            appData: {
              uniqueId: chatId,
              groupId: threadId || channel?.fileMetadata.appData.uniqueId,
              content: {
                message: message,
                deliveryStatus: CommunityDeliveryStatus.Sending,
                replyId: replyId,
                channelId: channel.fileMetadata.appData.uniqueId as string,
              },
              userDate,
            },
            senderOdinId: identity,
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

        insertNewMessage(
          queryClient,
          newMessageDsr as HomebaseFile<CommunityMessage>,
          community.fileMetadata.appData.uniqueId as string
        );
      },
      onSuccess: async (newMessage, params) => {
        if (!newMessage) return;
        const extistingMessages = queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<CommunityMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >(['community-messages', params.community.fileMetadata.appData.uniqueId]);
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
                    msg?.fileMetadata.appData.content.deliveryStatus <=
                      CommunityDeliveryStatus.Sent)
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
            ['community-messages', params.community.fileMetadata.appData.uniqueId],
            newData
          );
        }
      },
      onSettled: async () => {
        // queryClient.invalidateQueries({
        //   queryKey: ['community-messages', variables.conversation.fileMetadata.appData.uniqueId],
        // });
      },
    }),
    update: useMutation({
      mutationFn: updateMessage,
      onMutate: async ({ updatedChatMessage }) => {
        // Update chat messages
        const extistingMessages = queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<CommunityMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >(['community-messages', updatedChatMessage.fileMetadata.appData.groupId]);

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
            ['community-messages', updatedChatMessage.fileMetadata.appData.groupId],
            newData
          );
        }

        // Update chat message
        const existingMessage = queryClient.getQueryData<HomebaseFile<CommunityMessage>>([
          'community-message',
          updatedChatMessage.fileMetadata.appData.uniqueId,
        ]);

        if (existingMessage) {
          queryClient.setQueryData(
            ['community-message', updatedChatMessage.fileMetadata.appData.uniqueId],
            updatedChatMessage
          );
        }

        return { extistingMessages, existingMessage };
      },
      onError: (err, messageParams, context) => {
        queryClient.setQueryData(
          ['community-messages', messageParams.updatedChatMessage.fileMetadata.appData.groupId],
          context?.extistingMessages
        );

        queryClient.setQueryData(
          ['community-message', messageParams.updatedChatMessage.fileMetadata.appData.uniqueId],
          context?.existingMessage
        );
      },
    }),
  };
};
