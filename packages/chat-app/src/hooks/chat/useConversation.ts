import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
  getConversation,
  requestConversationCommand,
  updateConversation,
  updateGroupConversationCommand,
  uploadConversation,
} from '../../providers/ConversationProvider';
import {
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { getNewId, getNewXorId } from '@youfoundation/js-lib/helpers';
import { useConversations } from './useConversations';
import { deleteAllChatMessages } from '../../providers/ChatProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

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

  // Already get the conversations in the cache, so we can use that on `getExistingConversationsForRecipient`
  useConversations().all;

  const getExistingConversationsForRecipient = async (
    recipients: string[]
  ): Promise<null | HomebaseFile<Conversation>> => {
    const allConversationsInCache = await queryClient.fetchInfiniteQuery<{
      searchResults: HomebaseFile<Conversation>[];
    }>({ queryKey: ['conversations'], initialPageParam: undefined });

    for (const page of allConversationsInCache?.pages || []) {
      const matchedConversation = page.searchResults.find((conversation) => {
        const conversationContent = conversation.fileMetadata.appData.content;
        const conversationRecipients = (conversationContent as GroupConversation).recipients || [
          (conversationContent as SingleConversation).recipient,
        ];

        return (
          conversationRecipients.length === recipients.length &&
          conversationRecipients.every((recipient) => recipients.includes(recipient))
        );
      });
      if (matchedConversation) return matchedConversation;
    }

    return null;
  };

  const createConversation = async ({
    recipients,
    title,
  }: {
    recipients: string[];
    title?: string;
  }) => {
    // Check if there is already a conversations with this recipient.. If so.. Don't create a new one
    const existingConversation = await getExistingConversationsForRecipient(recipients);
    if (existingConversation)
      return {
        ...existingConversation,
        newConversationId: existingConversation.fileMetadata.appData.uniqueId as string,
      };

    const newConversationId =
      recipients.length === 1 ? await getNewXorId(identity as string, recipients[0]) : getNewId();

    const newConversation: NewHomebaseFile<Conversation> = {
      fileMetadata: {
        appData: {
          uniqueId: newConversationId,
          content: {
            ...(recipients.length > 1
              ? {
                  recipients: recipients,
                }
              : {
                  recipient: recipients[0],
                }),
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
    conversation: HomebaseFile<Conversation>;
  }): Promise<void> => {
    await requestConversationCommand(
      dotYouClient,
      conversation.fileMetadata.appData.content,
      conversation.fileMetadata.appData.uniqueId as string
    );
  };

  const updateExistingConversation = async ({
    conversation,
    isTitleUpdated = false,
  }: {
    conversation: HomebaseFile<Conversation>;
    isTitleUpdated?: boolean;
  }) => {
    await updateConversation(dotYouClient, conversation);
    if (isTitleUpdated && 'recipients' in conversation.fileMetadata.appData.content) {
      await updateGroupConversationCommand(
        dotYouClient,
        conversation.fileMetadata.appData.content as GroupConversation,
        conversation.fileMetadata.appData.uniqueId as string
      );
    }
  };

  const clearChat = async ({ conversation }: { conversation: HomebaseFile<Conversation> }) => {
    return await deleteAllChatMessages(
      dotYouClient,
      conversation.fileMetadata.appData.uniqueId as string
    );
  };

  const deleteChat = async ({ conversation }: { conversation: HomebaseFile<Conversation> }) => {
    const deletedResult = await deleteAllChatMessages(
      dotYouClient,
      conversation.fileMetadata.appData.uniqueId as string
    );
    if (!deletedResult) throw new Error('Failed to delete chat messages');

    // We soft delete the conversation, so we can still see newly received messages
    const newConversation: HomebaseFile<Conversation> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: { ...conversation.fileMetadata.appData, archivalStatus: 2 },
      },
    };

    return await updateConversation(dotYouClient, newConversation);
  };

  const restoreChat = async ({ conversation }: { conversation: HomebaseFile<Conversation> }) => {
    const newConversation: HomebaseFile<Conversation> = {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        appData: { ...conversation.fileMetadata.appData, archivalStatus: 0 },
      },
    };

    return await updateConversation(dotYouClient, newConversation);
  };

  return {
    single: useQuery({
      queryKey: ['conversation', conversationId],
      queryFn: () => getSingleConversation(dotYouClient, conversationId),
      enabled: !!conversationId,
    }),
    create: useMutation({
      mutationFn: createConversation,
      onSettled: async (_data) => {
        queryClient.invalidateQueries({ queryKey: ['conversation', _data?.newConversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
    inviteRecipient: useMutation({
      mutationFn: sendJoinCommand,
    }),
    update: useMutation({
      mutationFn: updateExistingConversation,
      onMutate: async (variables) => {
        queryClient.setQueryData<HomebaseFile<Conversation>>(
          ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
          variables.conversation
        );
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
