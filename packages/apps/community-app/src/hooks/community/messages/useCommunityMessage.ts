import {
  InfiniteData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ellipsisAtMaxCharOfRichText, useDotYouClientContext } from '@homebase-id/common-app';
import {
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
  NewMediaFile,
  RichText,
  SecurityGroupType,
  SystemFileType,
} from '@homebase-id/js-lib/core';
import { LinkPreview } from '@homebase-id/js-lib/media';
import {
  COMMUNITY_MESSAGE_FILE_TYPE,
  CommunityDeliveryStatus,
  CommunityMessage,
  getCommunityMessage,
  MESSAGE_CHARACTERS_LIMIT,
  updateCommunityMessage,
  uploadCommunityMessage,
} from '../../../providers/CommunityMessageProvider';
import {
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../../providers/CommunityDefinitionProvider';
import { formatGuidId, getNewId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import {
  increaseCommentCountForMessage,
  insertNewMessage,
  invalidateCommunityMessages,
  updateCacheCommunityMessages,
} from './useCommunityMessages';

export const getCommunityMessageQueryOptions = (
  queryClient: QueryClient,
  dotYouClient: DotYouClient,
  props?: {
    odinId: string | undefined;
    communityId: string | undefined;
    channelId?: string | undefined;
    messageId: string | undefined;
    fileSystemType?: SystemFileType;
  }
) => ({
  queryKey: [
    'community-message',
    formatGuidId(props?.communityId),
    formatGuidId(props?.messageId),
    props?.fileSystemType?.toLowerCase() || 'standard',
  ],
  queryFn: () =>
    getMessageByUniqueId(
      queryClient,
      dotYouClient,
      props?.odinId as string,
      props?.communityId as string,
      props?.channelId,
      props?.messageId as string,
      props?.fileSystemType
    ),
  enabled: !!props?.odinId && !!props?.communityId && !!props?.messageId,
  staleTime: 1000 * 60 * 2, // 2 minutes
});

export const useCommunityMessage = (props?: {
  odinId: string | undefined;
  communityId: string | undefined;
  channelId?: string | undefined;
  messageId: string | undefined;
  fileSystemType?: SystemFileType;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const identity = dotYouClient.getHostIdentity();

  const sendMessage = async ({
    community,
    channel,
    thread,
    threadParticipants,
    files,
    message,
    linkPreviews,
    chatId,
    userDate,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    channel: HomebaseFile<CommunityChannel>;
    thread?: HomebaseFile<CommunityMessage>;
    threadParticipants?: string[];
    files?: NewMediaFile[];
    message: RichText | undefined;
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
            channelId: channel.fileMetadata.appData.uniqueId as string,
            threadId: thread?.fileMetadata.appData.uniqueId as string,
          },
          fileType: COMMUNITY_MESSAGE_FILE_TYPE,
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
        : undefined,
      threadParticipants
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
    // We force set the keyHeader as it's returned from the upload, and needed for fast saves afterwards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newChat.sharedSecretEncryptedKeyHeader = uploadResult.keyHeader as any;

    return newChat;
  };

  const updateMessage = async ({
    updatedChatMessage,
    community,
    storeBackup,
  }: {
    updatedChatMessage: HomebaseFile<CommunityMessage>;
    community: HomebaseFile<CommunityDefinition>;
    storeBackup?: boolean;
  }) => {
    const transformedMessage = {
      ...updatedChatMessage,
    };
    const identity = dotYouClient.getLoggedInIdentity();
    if (identity && identity !== updatedChatMessage.fileMetadata.originalAuthor) {
      transformedMessage.fileMetadata.appData.content.collaborators = Array.from(
        new Set([
          ...(updatedChatMessage.fileMetadata.appData.content.collaborators || []),
          identity,
        ])
      );
    }

    await updateCommunityMessage(
      dotYouClient,
      community,
      transformedMessage,
      undefined,
      storeBackup
    );
  };

  return {
    get: useQuery(getCommunityMessageQueryOptions(queryClient, dotYouClient, props)),
    send: useMutation({
      mutationFn: sendMessage,
      onMutate: async ({ community, channel, files, message, chatId, thread, userDate }) => {
        const newMessageDsr: NewHomebaseFile<CommunityMessage> = {
          fileMetadata: {
            created: userDate,
            appData: {
              uniqueId: chatId,
              groupId:
                thread?.fileMetadata.globalTransitId || channel?.fileMetadata.appData.uniqueId,
              content: {
                message: ellipsisAtMaxCharOfRichText(message, MESSAGE_CHARACTERS_LIMIT),
                deliveryStatus: CommunityDeliveryStatus.Sending,
                channelId: channel.fileMetadata.appData.uniqueId as string,
              },
              userDate,
              fileType: COMMUNITY_MESSAGE_FILE_TYPE,
            },
            senderOdinId: identity,
            originalAuthor: identity,
            payloads: files?.map((file) => ({
              contentType: file.file.type,
              pendingFile: file.file,
              pendingFileUrl: URL.createObjectURL(file.file),
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

        if (thread) increaseCommentCountForMessage(queryClient, community, thread);
      },
      onSuccess: async (newMessage, params) => {
        if (!newMessage) return;

        updateCacheCommunityMessages(
          queryClient,
          params.community.fileMetadata.appData.uniqueId as string,
          newMessage.fileMetadata.appData.groupId,
          undefined,
          (data) => ({
            ...data,
            pages: data.pages.map((page) => ({
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
                        fileType: COMMUNITY_MESSAGE_FILE_TYPE,
                        ...msg?.fileMetadata.appData,
                        ...newMessage.fileMetadata.appData,
                        previewThumbnail: msg?.fileMetadata.appData.previewThumbnail,
                      },
                      payloads: msg?.fileMetadata.payloads,
                    },
                    sharedSecretEncryptedKeyHeader: newMessage.sharedSecretEncryptedKeyHeader,
                  };
                }

                return msg;
              }),
            })),
          })
        );
      },
      onError: (err, params) => {
        console.error('Failed to update the chat message', err);
        invalidateCommunityMessages(
          queryClient,
          params.community.fileMetadata.appData.uniqueId as string
        );
      },
    }),
    update: useMutation({
      mutationFn: updateMessage,
      onMutate: async ({ updatedChatMessage, community }) => {
        const transformedMessage = { ...updatedChatMessage };
        const identity = dotYouClient.getLoggedInIdentity();
        if (identity && identity !== updatedChatMessage.fileMetadata.originalAuthor) {
          transformedMessage.fileMetadata.appData.content.collaborators = Array.from(
            new Set([
              ...(updatedChatMessage.fileMetadata.appData.content.collaborators || []),
              identity,
            ])
          );
        }

        const extistingMessages = updateCacheCommunityMessages(
          queryClient,
          community.fileMetadata.appData.uniqueId as string,
          transformedMessage.fileMetadata.appData.content.channelId,
          transformedMessage.fileMetadata.appData.content.threadId,
          (data) => ({
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              searchResults: page.searchResults.map((msg) =>
                stringGuidsEqual(
                  msg?.fileMetadata.appData.uniqueId,
                  transformedMessage.fileMetadata.appData.uniqueId
                ) || stringGuidsEqual(msg?.fileId, transformedMessage.fileId)
                  ? transformedMessage
                  : msg
              ),
            })),
          })
        );

        const existingMessage = updateCacheCommunityMessage(
          queryClient,
          community.fileMetadata.appData.uniqueId as string,
          transformedMessage.fileMetadata.appData.uniqueId as string,
          transformedMessage.fileSystemType,
          () => transformedMessage
        );

        return { extistingMessages, existingMessage };
      },
      onError: (err, messageParams, context) => {
        updateCacheCommunityMessages(
          queryClient,
          messageParams.community.fileMetadata.appData.uniqueId as string,
          messageParams.updatedChatMessage.fileMetadata.appData.groupId,
          undefined,
          () => context?.extistingMessages
        );

        updateCacheCommunityMessage(
          queryClient,
          messageParams.community.fileMetadata.appData.uniqueId as string,
          messageParams.updatedChatMessage.fileMetadata.appData.uniqueId as string,
          messageParams.updatedChatMessage.fileSystemType,
          () => context?.existingMessage
        );
      },
    }),
  };
};

const getMessageByUniqueId = async (
  queryClient: QueryClient,
  dotYouClient: DotYouClient,
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

export const invalidateCommunityMessage = (
  queryClient: QueryClient,
  communityId: string,
  messageId?: string,
  fileSystemType?: SystemFileType
) => {
  queryClient.invalidateQueries({
    queryKey: ['community-message', communityId, messageId, fileSystemType?.toLowerCase()].filter(
      Boolean
    ),
    exact: !!messageId && !!fileSystemType && !!communityId,
  });
};

export const updateCacheCommunityMessage = (
  queryClient: QueryClient,
  communityId: string,
  messageId: string,
  fileSystemType: SystemFileType | undefined,
  transformFn: (data: HomebaseFile<CommunityMessage>) => HomebaseFile<CommunityMessage> | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<CommunityMessage>>([
    'community-message',
    formatGuidId(communityId),
    formatGuidId(messageId),
    fileSystemType?.toLowerCase() || 'standard',
  ]);
  if (!currentData) return;

  const updatedData = transformFn(currentData);
  if (!updatedData) return;

  queryClient.setQueryData(
    [
      'community-message',
      formatGuidId(communityId),
      formatGuidId(messageId),
      fileSystemType?.toLowerCase() || 'standard',
    ],
    updatedData
  );
  return currentData;
};
