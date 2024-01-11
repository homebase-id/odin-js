import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveSearchResult,
  Notify,
  ReceivedCommand,
  TypedConnectionNotification,
  getCommands,
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessageFileType, MARK_CHAT_READ_COMMAND } from '../../providers/ChatProvider';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';
import { getSingleConversation, useConversation } from './useConversation';
import { processCommand } from '../../providers/ChatCommandProvider';

const MINUTE_IN_MS = 60000;

// We first setup the websocket, and then trigger processing of the inbox
// So that new message will be detected by the websocket;
export const useLiveChatProcessor = () => {
  // Setup websocket, so that we get notified instantly when a new message is received
  const connected = useChatWebsocket();

  // Process the inbox on startup (once the socket is connected)
  const { status: inboxStatus } = useInboxProcessor(connected);

  // Only after the inbox is processed, we process commands as new ones might have been added via the inbox
  useChatCommandProcessor(inboxStatus === 'success');
};

// Process the inbox on startup
const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchData = async () => {
    const processedresult = await processInbox(dotYouClient, ChatDrive, 2000);
    return processedresult;
  };

  return useQuery({
    queryKey: ['processInbox'],
    queryFn: fetchData,
    refetchOnMount: false,
    // We want to refetch on window focus, as we might have missed some messages while the window was not focused and the websocket might have lost connection
    refetchOnWindowFocus: true,
    staleTime: MINUTE_IN_MS * 5,
    enabled: connected,
  });
};

const useChatWebsocket = () => {
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

  const handler = useCallback(async (notification: TypedConnectionNotification) => {
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
          queryFn: () => getSingleConversation(dotYouClient, conversationId),
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
  }, []);

  return useNotificationSubscriber(
    preAuthenticated ? handler : undefined,
    ['transitFileReceived', 'fileAdded'],
    [ChatDrive]
  );
};

const useChatCommandProcessor = (isEnabled?: boolean) => {
  const { getDotYouClient, getIdentity } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const identity = getIdentity();
  const queryClient = useQueryClient();

  const isProcessing = useRef(false);

  useEffect(() => {
    if (!isEnabled) return;

    (async () => {
      if (!identity) return;
      if (isProcessing.current) return;
      isProcessing.current = true;
      const commands = await getCommands(dotYouClient, ChatDrive);
      const filteredCommands = commands.receivedCommands.filter(
        (command) =>
          command.clientCode === JOIN_CONVERSATION_COMMAND ||
          command.clientCode === MARK_CHAT_READ_COMMAND ||
          command.clientCode === JOIN_GROUP_CONVERSATION_COMMAND
      );

      const completedCommands: string[] = [];
      // Can't use Promise.all, as we need to wait for the previous command to complete as commands can target the same conversation
      for (let i = 0; i < filteredCommands.length; i++) {
        const command = filteredCommands[i];

        const completedCommand = await processCommand(dotYouClient, queryClient, command, identity);
        if (completedCommand) completedCommands.push(completedCommand);
      }

      if (completedCommands.length > 0)
        await markCommandComplete(
          dotYouClient,
          ChatDrive,
          completedCommands.filter(Boolean) as string[]
        );

      isProcessing.current = false;
    })();
  }, [isEnabled]);
};
