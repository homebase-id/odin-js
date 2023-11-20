import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import {
  Conversation,
  getConversation,
  requestConversationCommand,
  uploadConversation,
} from '../../providers/ConversationProvider';
import { DotYouClient, NewDriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';

export const useConversation = (props?: { conversationId?: string | undefined }) => {
  const { conversationId } = props || {};
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getSingleConversation = async (dotYouClient: DotYouClient, conversationId: string) => {
    return await getConversation(dotYouClient, conversationId);
  };

  const createConversation = async ({ odinId }: { odinId: string }) => {
    const newConversationId = getNewId();

    const newConversation: NewDriveSearchResult<Conversation> = {
      fileMetadata: {
        appData: {
          content: {
            conversationId: newConversationId,
            recipient: odinId,
            title: odinId,
            unread: false,
            unreadCount: 0,
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

    await requestConversationCommand(dotYouClient, newConversation.fileMetadata.appData.content);
    return uploadResult;
  };

  return {
    single: useQuery({
      queryKey: ['conversation', conversationId],
      queryFn: () => getSingleConversation(dotYouClient, conversationId as string),
      enabled: !!conversationId,
    }),
    create: useMutation({
      mutationFn: createConversation,
      onMutate: async ({ odinId }) => {
        // TODO: Optimistic update of the conversations, append the new conversation
      },
      onSettled: async (_data, _error, variables) => {
        queryClient.invalidateQueries({ queryKey: ['conversation', _data?.newConversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
  };
};
