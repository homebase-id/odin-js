import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveSearchResult,
  Notify,
  ReceivedCommand,
  TypedConnectionNotification,
  markCommandComplete,
} from '@youfoundation/js-lib/core';

import { processInbox } from '@youfoundation/js-lib/peer';
import {
  ChatDrive,
  Conversation,
  JOIN_CONVERSATION_COMMAND,
  JOIN_GROUP_CONVERSATION_COMMAND,
} from '../../providers/ConversationProvider';
import { useDotYouClient, useNotificationSubscriber } from '@youfoundation/common-app';
import { preAuth } from '@youfoundation/js-lib/auth';
import { useEffect, useState } from 'react';
import { ChatMessageFileType, MARK_CHAT_READ_COMMAND } from '../../providers/ChatProvider';
import { processCommand } from './useChatCommandProcessor';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';
import { getSingleConversation, useConversation } from './useConversation';

const MINUTE_IN_MS = 60000;

// Process the inbox on startup
const useInboxProcessor = (isEnabled?: boolean) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchData = async () => {
    return await processInbox(dotYouClient, ChatDrive, 5);
  };

  return useQuery({
    queryKey: ['processInbox'],
    queryFn: fetchData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: MINUTE_IN_MS * 60,
    enabled: isEnabled,
  });
};

export const useChatTransitProcessor = (isEnabled = true) => {
  const [preAuthenticated, setIspreAuthenticated] = useState(false);

  const identity = useDotYouClient().getIdentity();
  const dotYouClient = useDotYouClient().getDotYouClient();

  // Added to ensure we have the conversation query available
  const {
    restoreChat: { mutate: restoreChat },
  } = useConversation();
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      if (!preAuthenticated) {
        await preAuth(dotYouClient);
        setIspreAuthenticated(true);
      }
    })();
  }, [preAuthenticated]);

  const handler = async (notification: TypedConnectionNotification) => {
    console.debug('[ChatTransitProcessor] Got notification', notification);
    if (notification.notificationType === 'transitFileReceived') {
      console.debug(
        '[TransitProcessor] Replying to TransitFileReceived by sending processTransitInstructions for the targetDrive'
      );

      Notify({
        command: 'processInbox',
        data: JSON.stringify({
          targetDrive: notification.externalFileIdentifier.targetDrive,
          batchSize: 100,
        }),
      });
    }

    if (
      (notification.notificationType === 'fileAdded' ||
        notification.notificationType === 'fileModified') &&
      notification.targetDrive?.alias === ChatDrive.alias &&
      notification.targetDrive?.type === ChatDrive.type
    ) {
      if (notification.header.fileMetadata.appData.fileType === ChatMessageFileType) {
        const conversationId = notification.header.fileMetadata.appData.groupId;
        queryClient.invalidateQueries({ queryKey: ['chat', conversationId] });

        // Check if the message is orphaned from a conversation
        const conversation = await queryClient.fetchQuery<DriveSearchResult<Conversation> | null>({
          queryKey: ['conversation', conversationId],
          queryFn: () => getSingleConversation(dotYouClient, conversationId as string),
        });

        if (!conversation) {
          console.error('Orphaned message received', notification.header.fileId, conversation);
          // Can't handle this one ATM.. How to resolve?
        } else if (conversation.fileMetadata.appData.archivalStatus === 2) {
          restoreChat({ conversation });
        }
      } else if (
        [
          JOIN_CONVERSATION_COMMAND,
          JOIN_GROUP_CONVERSATION_COMMAND,
          MARK_CHAT_READ_COMMAND,
        ].includes(notification.header.fileMetadata.appData.dataType) &&
        identity
      ) {
        const command: ReceivedCommand = tryJsonParse<ReceivedCommand>(
          notification.header.fileMetadata.appData.content
        );
        command.sender = notification.header.fileMetadata.senderOdinId;
        command.clientCode = notification.header.fileMetadata.appData.dataType;
        command.id = notification.header.fileId;

        const processedCommand = await processCommand(dotYouClient, queryClient, command, identity);
        if (processedCommand)
          await markCommandComplete(dotYouClient, ChatDrive, [processedCommand]);
      }
    }
  };

  useNotificationSubscriber(
    isEnabled && preAuthenticated ? handler : undefined,
    ['transitFileReceived', 'fileAdded'],
    [ChatDrive]
  );

  // We first setup the websocket, and then trigger processing of the inbox
  // So that new message will be detected by the websocket;
  useInboxProcessor(isEnabled);
};
