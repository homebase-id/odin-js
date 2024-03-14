import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  ReactionFile,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';
import {
  ChatDrive,
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { ChatMessage } from '../../providers/ChatProvider';
import {
  ChatReaction,
  deleteReaction,
  getReactions,
  uploadReaction,
} from '../../providers/ChatReactionProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const useChatReaction = (props?: {
  messageGlobalTransitId: string | undefined;
  messageFileId: string | undefined;
}) => {
  const { messageGlobalTransitId, messageFileId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getReactionsByMessageUniqueId =
    (messageFileId: string, messageGlobalTransitId: string) => async () => {
      return (
        (
          await getReactions(dotYouClient, {
            target: {
              fileId: messageFileId,
              globalTransitId: messageGlobalTransitId,
              targetDrive: ChatDrive,
            },
          })
        )?.reactions || []
      );
    };

  const addReaction = async ({
    conversation,
    message,
    reaction,
  }: {
    conversation: DriveSearchResult<Conversation>;
    message: DriveSearchResult<ChatMessage>;
    reaction: string;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const recipients =
      (conversationContent as GroupConversation).recipients ||
      [(conversationContent as SingleConversation).recipient].filter(Boolean);

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await uploadReaction(
      dotYouClient,
      message.fileMetadata.globalTransitId,
      reaction,
      recipients
    );
  };

  const removeReaction = async ({
    conversation,
    message,
    reaction,
  }: {
    conversation: DriveSearchResult<Conversation>;
    message: DriveSearchResult<ChatMessage>;
    reaction: ReactionFile;
  }) => {
    const conversationContent = conversation.fileMetadata.appData.content;
    const recipients =
      (conversationContent as GroupConversation).recipients ||
      [(conversationContent as SingleConversation).recipient].filter(Boolean);

    if (!message.fileMetadata.globalTransitId)
      throw new Error('Message does not have a global transit id');

    return await deleteReaction(dotYouClient, recipients, reaction, {
      fileId: message.fileId,
      globalTransitId: message.fileMetadata.globalTransitId,
      targetDrive: ChatDrive,
    });
  };

  return {
    get: useQuery({
      queryKey: ['chat-reaction', messageGlobalTransitId],
      queryFn: getReactionsByMessageUniqueId(
        messageFileId as string,
        messageGlobalTransitId as string
      ),
      enabled: !!messageGlobalTransitId && !!messageFileId,
      staleTime: 1000 * 60 * 10, // 10 min
    }),
    add: useMutation({
      mutationFn: addReaction,
      // onMutate: async (variables) => {
      //   const { message } = variables;
      //   const previousReactions = queryClient.getQueryData<DriveSearchResult<ChatReaction>[]>([
      //     'chat-reaction',
      //     message.fileMetadata.appData.uniqueId,
      //   ]);

      //   if (!previousReactions) return;
      //   const newReaction: NewDriveSearchResult<ChatReaction> = {
      //     fileMetadata: {
      //       appData: {
      //         content: {
      //           message: variables.reaction,
      //         },
      //       },
      //     },
      //     serverMetadata: {
      //       accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected },
      //     },
      //   };

      //   queryClient.setQueryData(
      //     ['chat-reaction', message.fileMetadata.appData.uniqueId],
      //     [...previousReactions, newReaction]
      //   );
      // },
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.globalTransitId],
        });
      },
    }),
    remove: useMutation({
      mutationFn: removeReaction,
      // onMutate: async (variables) => {
      //   const { message, reaction } = variables;
      //   const previousReactions = queryClient.getQueryData<DriveSearchResult<ChatReaction>[]>([
      //     'chat-reaction',
      //     message.fileMetadata.appData.uniqueId,
      //   ]);

      //   if (!previousReactions) return;

      //   queryClient.setQueryData(
      //     ['chat-reaction', message.fileMetadata.appData.uniqueId],
      //     [...previousReactions.filter((r) => !stringGuidsEqual(r.fileId, reaction.fileId))]
      //   );
      // },
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['chat-reaction', variables.message.fileMetadata.globalTransitId],
        });
      },
    }),
  };
};
