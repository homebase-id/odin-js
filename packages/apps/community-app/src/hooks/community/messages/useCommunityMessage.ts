import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  HomebaseFile,
  NewHomebaseFile,
  NewMediaFile,
  RichText,
  SecurityGroupType,
  SystemFileType,
} from '@homebase-id/js-lib/core';
import { LinkPreview } from '@homebase-id/js-lib/media';
import {
  CommunityDeliveryStatus,
  CommunityMessage,
  getCommunityMessage,
  updateCommunityMessage,
  uploadCommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import {
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../../providers/CommunityDefinitionProvider';
import { formatGuidId, getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { insertNewMessage } from './useCommunityMessages';

export const useCommunityMessage = (props?: {
  odinId: string | undefined;
  communityId: string | undefined;
  channelId?: string | undefined;
  messageId: string | undefined;
  fileSystemType?: SystemFileType;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const identity = dotYouClient.getIdentity();

  const getMessageByUniqueId = async (
    odinId: string,
    communityId: string,
    channelId: string | undefined,
    messageId: string,
    fileSystemType?: SystemFileType
  ) => {
    const channelCache = queryClient.getQueryData<
      InfiniteData<{
        searchResults: (HomebaseFile<CommunityMessage> | null)[];
        cursorState: string;
        queryTime: number;
        includeMetadataHeader: boolean;
      }>
    >(['community-messages', formatGuidId(communityId), formatGuidId(channelId || communityId)]);

    if (channelCache) {
      const message = channelCache.pages
        .map((page) => page.searchResults)
        .flat()
        .find((msg) => stringGuidsEqual(msg?.fileMetadata.appData.uniqueId, messageId));

      if (message) return message;
    }

    return await getCommunityMessage(dotYouClient, odinId, communityId, messageId, fileSystemType);
  };

  const sendMessage = async ({
    community,
    channel,
    thread,
    replyId,
    files,
    message,
    linkPreviews,
    chatId,
    userDate,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    channel: HomebaseFile<CommunityChannel>;
    thread?: HomebaseFile<CommunityMessage>;
    replyId?: string;
    files?: NewMediaFile[];
    message: RichText | string;
    linkPreviews?: LinkPreview[];
    chatId?: string;
    userDate?: number;
  }): Promise<NewHomebaseFile<CommunityMessage> | null> => {
    // We prefer having the uniqueId set outside of the mutation, so that an auto-retry of the mutation doesn't create duplicates
    const newChatId = chatId || getNewId();
    const newChat: NewHomebaseFile<CommunityMessage> = {
      fileMetadata: {
        created: userDate,
        appData: {
          uniqueId: newChatId,
          groupId: thread?.fileMetadata.globalTransitId || channel?.fileMetadata.appData.uniqueId,
          content: {
            message: message,
            deliveryStatus: CommunityDeliveryStatus.Sent,
            replyId: replyId,
            channelId: channel.fileMetadata.appData.uniqueId as string,
            threadId: thread?.fileMetadata.appData.uniqueId as string,
          },

          userDate: userDate || new Date().getTime(),
        },
      },
      serverMetadata: {
        accessControlList: community.fileMetadata.appData.content.acl || {
          requiredSecurityGroup: SecurityGroupType.AutoConnected,
        },
      },
      fileSystemType: thread ? 'Comment' : undefined,
    };

    const uploadResult = await uploadCommunityMessage(
      dotYouClient,
      community,
      newChat,
      files,
      linkPreviews,
      thread && thread.fileMetadata.globalTransitId
        ? {
            targetDrive: getTargetDriveFromCommunityId(
              community.fileMetadata.appData.uniqueId as string
            ),
            globalTransitId: thread.fileMetadata.globalTransitId,
          }
        : undefined
    );
    if (!uploadResult) throw new Error('Failed to send the chat message');

    if ('file' in uploadResult) {
      newChat.fileId = uploadResult.file.fileId;
      newChat.fileMetadata.versionTag = uploadResult.newVersionTag;
    } else {
      newChat.fileMetadata.globalTransitId =
        uploadResult.remoteGlobalTransitIdFileIdentifier.globalTransitId;
    }

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
    await updateCommunityMessage(dotYouClient, community, updatedChatMessage);
  };

  return {
    get: useQuery({
      queryKey: ['community-message', props?.communityId, props?.messageId],
      queryFn: () =>
        getMessageByUniqueId(
          props?.odinId as string,
          props?.communityId as string,
          props?.channelId,
          props?.messageId as string,
          props?.fileSystemType
        ),
      enabled: !!props?.odinId && !!props?.communityId && !!props?.messageId,
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
        thread,
        userDate,
      }) => {
        const newMessageDsr: NewHomebaseFile<CommunityMessage> = {
          fileMetadata: {
            created: userDate,
            appData: {
              uniqueId: chatId,
              groupId:
                thread?.fileMetadata.globalTransitId || channel?.fileMetadata.appData.uniqueId,
              content: {
                message: message,
                deliveryStatus: CommunityDeliveryStatus.Sending,
                replyId: replyId,
                channelId: channel.fileMetadata.appData.uniqueId as string,
              },
              userDate,
            },
            senderOdinId: community.fileMetadata.senderOdinId,
            originalAuthor: identity,
            payloads: files?.map((file) => ({
              contentType: file.file.type,
              pendingFile: file.file,
            })),
          },
          fileSystemType: thread ? 'Comment' : undefined,
          serverMetadata: {
            accessControlList: community.fileMetadata.appData.content.acl || {
              requiredSecurityGroup: SecurityGroupType.AutoConnected,
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
        >([
          'community-messages',
          formatGuidId(params.community.fileMetadata.appData.uniqueId),
          formatGuidId(
            newMessage.fileMetadata.appData.groupId ||
              params.community.fileMetadata.appData.uniqueId
          ),
        ]);

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
                    ...msg,
                    ...newMessage,
                    fileMetadata: {
                      ...msg?.fileMetadata,
                      ...newMessage.fileMetadata,
                      appData: {
                        ...msg?.fileMetadata.appData,
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
            [
              'community-messages',
              formatGuidId(params.community.fileMetadata.appData.uniqueId),
              formatGuidId(
                newMessage.fileMetadata.appData.groupId ||
                  params.community.fileMetadata.appData.uniqueId ||
                  ''
              ),
            ],
            newData
          );
        }
      },
      onError: (err) => {
        console.error('Failed to update the chat message', err);
      },
    }),
    update: useMutation({
      mutationFn: updateMessage,
      onMutate: async ({ updatedChatMessage, community }) => {
        // Update chat messages
        const extistingMessages = queryClient.getQueryData<
          InfiniteData<{
            searchResults: (HomebaseFile<CommunityMessage> | null)[];
            cursorState: string;
            queryTime: number;
            includeMetadataHeader: boolean;
          }>
        >([
          'community-messages',
          formatGuidId(community.fileMetadata.appData.uniqueId),
          formatGuidId(updatedChatMessage.fileMetadata.appData.groupId),
        ]);

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
            [
              'community-messages',
              formatGuidId(community.fileMetadata.appData.uniqueId),
              formatGuidId(updatedChatMessage.fileMetadata.appData.groupId),
            ],
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
          [
            'community-messages',
            formatGuidId(messageParams.community.fileMetadata.appData.uniqueId),
            formatGuidId(messageParams.updatedChatMessage.fileMetadata.appData.groupId),
          ],
          context?.extistingMessages
        );

        queryClient.setQueryData(
          [
            'community-message',
            formatGuidId(messageParams.updatedChatMessage.fileMetadata.appData.uniqueId),
          ],
          context?.existingMessage
        );
      },
    }),
  };
};