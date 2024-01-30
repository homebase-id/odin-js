import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveSearchResult,
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
import { hasDebugFlag, stringGuidsEqual, tryJsonParse } from '@youfoundation/js-lib/helpers';
import { getSingleConversation, useConversation } from './useConversation';
import { processCommand } from '../../providers/ChatCommandProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

const MINUTE_IN_MS = 60000;

// We first process the inbox, then we connect for live updates;
export const useLiveChatProcessor = () => {
  // Process the inbox on startup; As we want to cover the backlog of messages first
  const { status: inboxStatus } = useInboxProcessor(true);

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useChatWebsocket(inboxStatus === 'success');

  // Only after the inbox is processed, we process commands as new ones might have been added via the inbox
  useChatCommandProcessor(inboxStatus === 'success');

  return isOnline;
};

// Process the inbox on startup
const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchData = async () => {
    const processedresult = await processInbox(dotYouClient, ChatDrive, 2000);
    // We don't know how many messages we have processed, so we can only invalidate the entire chat query
    queryClient.invalidateQueries({ queryKey: ['chat'] });
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

const isDebug = hasDebugFlag();

const useChatWebsocket = (isEnabled: boolean) => {
  const [preAuthenticated, setIspreAuthenticated] = useState(false);

  const identity = useDotYouClient().getIdentity();
  const dotYouClient = useDotYouClientContext();

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
    isDebug && console.debug('[ChatWebsocket] Got notification', notification);

    if (
      notification.notificationType === 'fileAdded' &&
      stringGuidsEqual(notification.targetDrive?.alias, ChatDrive.alias) &&
      stringGuidsEqual(notification.targetDrive?.type, ChatDrive.type)
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
    preAuthenticated && isEnabled ? handler : undefined,
    ['fileAdded'],
    [ChatDrive],
    () => {
      queryClient.invalidateQueries({ queryKey: ['processInbox'] });
    }
  );
};

const useChatCommandProcessor = (isEnabled?: boolean) => {
  const { getIdentity } = useDotYouClient();
  const dotYouClient = useDotYouClientContext();
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
