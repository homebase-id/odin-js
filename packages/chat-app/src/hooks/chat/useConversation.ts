import {
  InfiniteData,
  QueryClient,
  UndefinedInitialDataOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useDotYouClient } from '@homebase-id/common-app';
import {
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
import { ChatConversationsReturn } from './useConversations';
import { deleteAllChatMessages } from '../../providers/ChatProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const getSingleConversation = async (
  dotYouClient: DotYouClient,
  conversationId: string | undefined
) => {
  return conversationId ? await getConversation(dotYouClient, conversationId) : null;
};

export const useConversation = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const identity = useDotYouClient().getIdentity();

  const createConversation = async ({
    recipients,
    title,
  }: {
    recipients: string[];
    title?: string;
  }) => {
    const newConversationId =
      recipients.length === 1
        ? await getNewXorId(identity as string, recipients[0])
        : formatGuidId(getNewId());

    if (recipients.length === 1) {
      const existingConversation = await getConversation(dotYouClient, newConversationId);
      if (existingConversation) return { ...existingConversation, newConversationId };
    }

    const updatedRecipients = [...new Set([...recipients, identity as string])];

    const newConversation: NewHomebaseFile<UnifiedConversation> = {
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
    conversation: HomebaseFile<UnifiedConversation>;
  }) => {
    return await uploadConversation(dotYouClient, conversation, true);
  };

  const updateExistingConversation = async ({
    conversation,
    distribute = false,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
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
    conversation: HomebaseFile<UnifiedConversation>;
  }) => {
    return await deleteAllChatMessages(
      dotYouClient,
      conversation.fileMetadata.appData.uniqueId as string
    );
  };

  const deleteChat = async ({
    conversation,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
  }) => {
    const deletedResult = await deleteAllChatMessages(
      dotYouClient,
      conversation.fileMetadata.appData.uniqueId as string
    );
    if (!deletedResult) throw new Error('Failed to delete chat messages');

    // We soft delete the conversation, so we can still see newly received messages
    const newConversation: HomebaseFile<UnifiedConversation> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: { ...conversation.fileMetadata.appData, archivalStatus: 2 },
      },
    };

    return await updateConversation(dotYouClient, newConversation);
  };

  const restoreChat = async ({
    conversation,
  }: {
    conversation: HomebaseFile<UnifiedConversation>;
  }) => {
    const newConversation: HomebaseFile<UnifiedConversation> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: { ...conversation.fileMetadata.appData, archivalStatus: 0 },
      },
    };

    return await updateConversation(dotYouClient, newConversation);
  };

  return {
    single: useQuery(getConversationQueryOptions(dotYouClient, queryClient, conversationId)),
    create: useMutation({
      mutationFn: createConversation,
      onSettled: async (_data) => {
        queryClient.invalidateQueries({ queryKey: ['conversation', _data?.newConversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
    inviteRecipient: useMutation({
      mutationFn: sendJoinCommand,
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
    update: useMutation({
      mutationFn: updateExistingConversation,
      onMutate: async (variables) => {
        queryClient.setQueryData<HomebaseFile<UnifiedConversation>>(
          ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
          variables.conversation
        );
        const existingData = queryClient.getQueryData<InfiniteData<ChatConversationsReturn>>([
          'conversations',
        ]);
        if (existingData) {
          const newConversations = {
            ...existingData,
            pages: existingData.pages.map((page) => ({
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
          };
          queryClient.setQueryData(['conversations'], newConversations);
        }
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
        });
      },
    }),
    clearChat: useMutation({
      mutationFn: clearChat,

      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
        });
        queryClient.invalidateQueries({
          queryKey: ['chat-messages', variables.conversation.fileMetadata.appData.uniqueId],
        });
      },
    }),
    deleteChat: useMutation({
      mutationFn: deleteChat,

      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['conversations'],
        });
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
        });
        queryClient.invalidateQueries({
          queryKey: ['chat-messages', variables.conversation.fileMetadata.appData.uniqueId],
        });
      },
    }),
    restoreChat: useMutation({
      mutationFn: restoreChat,

      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['conversations'],
        });
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
        });
        queryClient.invalidateQueries({
          queryKey: ['chat-messages', variables.conversation.fileMetadata.appData.uniqueId],
        });
      },
    }),
  };
};

const fetchSingleConversation = async (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  conversationId: string
) => {
  const queryData = queryClient.getQueryData<
    InfiniteData<{
      searchResults: HomebaseFile<UnifiedConversation>[];
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

  const conversationFromServer = await getSingleConversation(dotYouClient, conversationId);
  // Don't cache if the conversation is not found
  if (!conversationFromServer) throw new Error('Conversation not found');

  return conversationFromServer;
};

export const getConversationQueryOptions: (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  conversationId: string | undefined
) => UndefinedInitialDataOptions<HomebaseFile<UnifiedConversation> | null> = (
  dotYouClient,
  queryClient,
  conversationId
) => ({
  queryKey: ['conversation', conversationId],
  queryFn: () => fetchSingleConversation(dotYouClient, queryClient, conversationId as string),
  refetchOnMount: false,
  staleTime: 1000 * 60 * 5, // 5 minutes before updates to a conversation on another device are fetched on this one (when you were offline)
  enabled: !!conversationId,
  networkMode: 'offlineFirst', // We want to try the useConversations cache first
});
