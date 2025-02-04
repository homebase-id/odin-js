import {
  InfiniteData,
  QueryClient,
  UndefinedInitialDataOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ConversationMetadata,
  UnifiedConversation,
  getConversation,
  updateConversation,
  uploadConversation,
} from '../../providers/ConversationProvider';
import {
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import { formatGuidId, getNewId, getNewXorId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { invalidateConversations, updateCacheConversations } from './useConversations';
import { deleteAllChatMessages } from '../../providers/ChatProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { invalidateChatMessages } from './useChatMessages';

export const useConversation = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

  const createConversation = async ({
    recipients,
    title,
  }: {
    recipients: string[];
    title?: string;
  }) => {
    const newConversationId =
      recipients.length === 1
        ? await getNewXorId(loggedOnIdentity as string, recipients[0])
        : formatGuidId(getNewId());

    if (recipients.length === 1) {
      const existingConversation = await getConversation(dotYouClient, newConversationId);
      if (existingConversation) return { ...existingConversation, newConversationId };
    }

    const updatedRecipients = [...new Set([...recipients, loggedOnIdentity as string])];

    const newConversation: NewHomebaseFile<UnifiedConversation, ConversationMetadata> = {
      fileMetadata: {
        appData: {
          uniqueId: newConversationId,
          content: {
            recipients: updatedRecipients,
            title: title || recipients.join(', '),
          },
        },
      },
      serverMetadata: {
        accessControlList: {
          requiredSecurityGroup: SecurityGroupType.Owner,
        },
      },
    };

    const uploadResult = {
      newConversationId,
      ...(await uploadConversation(dotYouClient, newConversation)),
    };

    return uploadResult;
  };

  const sendJoinCommand = async ({
    conversation,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  }) => {
    return await uploadConversation(dotYouClient, conversation, true);
  };

  const updateExistingConversation = async ({
    conversation,
    distribute = false,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
    distribute?: boolean;
  }) => {
    if (distribute && conversation.fileMetadata.appData.content.recipients?.length >= 2) {
      return await updateConversation(dotYouClient, conversation, distribute);
    } else {
      return await updateConversation(dotYouClient, conversation);
    }
  };

  const clearChat = async ({
    conversation,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  }) => {
    return await deleteAllChatMessages(
      dotYouClient,
      conversation.fileMetadata.appData.uniqueId as string
    );
  };

  const deleteChat = async ({
    conversation,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  }) => {
    const deletedResult = await deleteAllChatMessages(
      dotYouClient,
      conversation.fileMetadata.appData.uniqueId as string
    );
    if (!deletedResult) throw new Error('Failed to delete chat messages');

    // We soft delete the conversation, so we can still see newly received messages
    const newConversation: HomebaseFile<UnifiedConversation, ConversationMetadata> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: { ...conversation.fileMetadata.appData, archivalStatus: 2 },
      },
    };

    return await updateConversation(dotYouClient, newConversation);
  };

  const archiveChat = async ({
    conversation,
  }: {
    conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  }) => {
    const newConversation: HomebaseFile<UnifiedConversation, ConversationMetadata> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: { ...conversation.fileMetadata.appData, archivalStatus: 3 },
      },
    };

    return await updateConversation(dotYouClient, newConversation);
  };

  return {
    single: useQuery(getConversationQueryOptions(dotYouClient, queryClient, conversationId)),
    create: useMutation({
      mutationFn: createConversation,
      onSettled: async (_data) => {
        invalidateConversation(queryClient, _data?.newConversationId);
        invalidateConversations(queryClient);
      },
    }),
    inviteRecipient: useMutation({
      mutationFn: sendJoinCommand,
      onSettled: async (_data, _error, variables) => {
        invalidateConversation(queryClient, variables.conversation.fileMetadata.appData.uniqueId);
        invalidateConversations(queryClient);
      },
    }),
    update: useMutation({
      mutationFn: updateExistingConversation,
      onMutate: async (variables) => {
        updateCacheConversation(
          queryClient,
          variables.conversation.fileMetadata.appData.uniqueId as string,
          () => variables.conversation
        );
        updateCacheConversations(queryClient, (data) => ({
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            searchResults: page.searchResults.map((conversation) =>
              stringGuidsEqual(
                conversation.fileMetadata.appData.uniqueId,
                variables.conversation.fileMetadata.appData.uniqueId
              )
                ? variables.conversation
                : conversation
            ),
          })),
        }));
      },
      onSettled: async (_data, _error, variables) => {
        invalidateConversations(queryClient);
        invalidateConversation(queryClient, variables.conversation.fileMetadata.appData.uniqueId);
      },
    }),
    clearChat: useMutation({
      mutationFn: clearChat,

      onSettled: async (_data, _error, variables) => {
        invalidateConversation(queryClient, variables.conversation.fileMetadata.appData.uniqueId);
        invalidateChatMessages(
          queryClient,
          variables.conversation.fileMetadata.appData.uniqueId as string
        );
      },
    }),
    deleteChat: useMutation({
      mutationFn: deleteChat,

      onSettled: async (_data, _error, variables) => {
        invalidateConversations(queryClient);
        invalidateConversation(queryClient, variables.conversation.fileMetadata.appData.uniqueId);
        invalidateChatMessages(
          queryClient,
          variables.conversation.fileMetadata.appData.uniqueId as string
        );
      },
    }),
    archiveChat: useMutation({
      mutationFn: archiveChat,

      onSettled: async (_data, _error, variables) => {
        invalidateConversations(queryClient);
        invalidateConversation(queryClient, variables.conversation.fileMetadata.appData.uniqueId);
        invalidateChatMessages(
          queryClient,
          variables.conversation.fileMetadata.appData.uniqueId as string
        );
      },
    }),
    restoreChat: useMutation({
      mutationFn: ({
        conversation,
      }: {
        conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
      }) => restoreChat(dotYouClient, conversation),

      onSettled: async (_data, _error, variables) => {
        invalidateConversations(queryClient);
        invalidateConversation(queryClient, variables.conversation.fileMetadata.appData.uniqueId);
        invalidateChatMessages(
          queryClient,
          variables.conversation.fileMetadata.appData.uniqueId as string
        );
      },
    }),
  };
};

export const restoreChat = async (
  dotYouClient: DotYouClient,
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>
) => {
  const newConversation: HomebaseFile<UnifiedConversation, ConversationMetadata> = {
    ...conversation,
    fileMetadata: {
      ...conversation.fileMetadata,
      appData: { ...conversation.fileMetadata.appData, archivalStatus: 0 },
    },
  };

  return await updateConversation(dotYouClient, newConversation);
};

export const invalidateConversation = (queryClient: QueryClient, conversationId?: string) => {
  queryClient.invalidateQueries({
    queryKey: ['conversation', conversationId].filter(Boolean),
    exact: !!conversationId,
  });
};

export const updateCacheConversation = (
  queryClient: QueryClient,
  conversationId: string,
  transformFn: (
    data: HomebaseFile<UnifiedConversation, ConversationMetadata>
  ) => HomebaseFile<UnifiedConversation, ConversationMetadata> | undefined
) => {
  const conversation = queryClient.getQueryData<
    HomebaseFile<UnifiedConversation, ConversationMetadata>
  >(['conversation', conversationId]);
  if (!conversation) return;

  const updatedConversation = transformFn(conversation);
  if (!updatedConversation) return;

  queryClient.setQueryData(['conversation', conversationId], updatedConversation);
  return conversation;
};

const fetchSingleConversation = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  conversationId: string
): Promise<HomebaseFile<UnifiedConversation, ConversationMetadata> | null> => {
  const queryData = queryClient.getQueryData<
    InfiniteData<{
      searchResults: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
      cursorState: string;
      queryTime: number;
      includeMetadataHeader: boolean;
    }>
  >(['conversations']);

  const conversationFromCache = queryData?.pages
    .flatMap((page) => page.searchResults)
    .find((conversation) =>
      stringGuidsEqual(conversation.fileMetadata.appData.uniqueId, conversationId)
    );
  if (conversationFromCache) return conversationFromCache;

  if (!conversationId) return null;

  const conversationFromServer = await getConversation(dotYouClient, conversationId);
  // Don't cache if the conversation is not found
  if (!conversationFromServer) throw new Error('Conversation not found');

  return conversationFromServer;
};

export const getConversationQueryOptions: (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  conversationId: string | undefined
) => UndefinedInitialDataOptions<HomebaseFile<UnifiedConversation, ConversationMetadata> | null> = (
  dotYouClient,
  queryClient,
  conversationId
) => ({
  queryKey: ['conversation', conversationId],
  queryFn: () => fetchSingleConversation(dotYouClient, queryClient, conversationId as string),
  staleTime: 1000 * 60 * 60 * 24, // 24 hours
  enabled: !!conversationId,
  retry: (failureCount, error) => {
    if (error.message === 'Conversation not found') {
      return false;
    }

    return failureCount < 5;
  },
  networkMode: 'offlineFirst', // We want to try the useConversations cache first
});
