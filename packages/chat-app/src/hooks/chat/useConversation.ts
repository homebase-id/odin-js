import { useMutation, useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import {
  Conversation,
  getConversation,
  uploadConversation,
} from '../../providers/ConversationProvider';
import { DotYouClient, NewDriveSearchResult, SecurityGroupType } from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';

export const useConversation = ({ conversationId }: { conversationId?: string | undefined }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

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

    return { newConversationId, ...(await uploadConversation(dotYouClient, newConversation)) };
  };

  return {
    single: useQuery({
      queryKey: ['conversation', conversationId],
      queryFn: () => getSingleConversation(dotYouClient, conversationId as string),
      enabled: !!conversationId,
    }),
    create: useMutation({
      mutationFn: createConversation,
    }),
  };
};
