import { useMutation, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
  getConversation,
  requestConversationCommand,
  updateConversation,
  uploadConversation,
} from '../../providers/ConversationProvider';
import {
  DotYouClient,
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import { getNewId, getNewXorId } from '@youfoundation/js-lib/helpers';
import { useConversations } from './useConversations';

export const useConversation = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();
  const identity = useDotYouClient().getIdentity();

  // Already get the conversations in the cache, so we can use that on `getExistingConversationsForRecipient`
  useConversations().all;

  const getSingleConversation = async (dotYouClient: DotYouClient, conversationId: string) => {
    return await getConversation(dotYouClient, conversationId);
  };

  const getExistingConversationsForRecipient = async (
    recipients: string[]
  ): Promise<null | DriveSearchResult<Conversation>> => {
    const allConversationsInCache = await queryClient.fetchQuery<
      InfiniteData<{ searchResults: DriveSearchResult<Conversation>[] }>
    >({ queryKey: ['conversations'] });

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

  const createConversation = async ({ recipients }: { recipients: string[] }) => {
    // Check if there is already a conversations with this recipient.. If so.. Don't create a new one
    const existingConversation = await getExistingConversationsForRecipient(recipients);
    if (existingConversation)
      return {
        ...existingConversation,
        newConversationId: existingConversation.fileMetadata.appData.uniqueId as string,
      };

    const newConversationId =
      recipients.length === 1 ? await getNewXorId(identity as string, recipients[0]) : getNewId();

    const newConversation: NewDriveSearchResult<Conversation> = {
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
            title: recipients.join(', '),
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
    conversation: DriveSearchResult<Conversation>;
  }): Promise<void> => {
    await requestConversationCommand(
      dotYouClient,
      conversation.fileMetadata.appData.content,
      conversation.fileMetadata.appData.uniqueId as string
    );
  };

  const updateExistingConversation = async ({
    conversation,
  }: {
    conversation: DriveSearchResult<Conversation>;
  }) => {
    return await updateConversation(dotYouClient, conversation);
  };

  return {
    single: useQuery({
      queryKey: ['conversation', conversationId],
      queryFn: () => getSingleConversation(dotYouClient, conversationId as string),
      enabled: !!conversationId,
    }),
    create: useMutation({
      mutationFn: createConversation,
      onMutate: async ({ recipients }) => {
        // TODO: Optimistic update of the conversations, append the new conversation
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({ queryKey: ['conversation', _data?.newConversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
    inviteRecipient: useMutation({
      mutationFn: sendJoinCommand,
    }),
    update: useMutation({
      mutationFn: updateExistingConversation,
      onMutate: async () => {
        // TODO: Optimistic update of the conversations, append the new conversation
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['conversation', variables.conversation.fileMetadata.appData.uniqueId],
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
  };
};
