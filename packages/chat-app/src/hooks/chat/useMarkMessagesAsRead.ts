import { useRef } from 'react';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import { useChatMessages } from './useChatMessages';
import { useEffect, useState } from 'react';
import { UnifiedConversation } from '../../providers/ConversationProvider';
import { useConversation } from './useConversation';

export const useMarkMessagesAsRead = ({
  conversation,
  messages,
}: {
  conversation: HomebaseFile<UnifiedConversation> | undefined;
  messages: HomebaseFile<ChatMessage>[] | undefined;
}) => {
  const { mutateAsync: markAsRead } = useChatMessages({
    conversationId: conversation?.fileMetadata.appData.uniqueId,
  }).markAsRead;
  const isProcessing = useRef(false);
  const [messagesMarkedAsRead, setMessagesMarkedAsRead] = useState<boolean>(false);

  const { mutate: updateConversation } = useConversation().update;
  const [pendingReadTime, setPendingReadTime] = useState<Date | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (!conversation || !messages || isProcessing.current) return;
      setPendingReadTime(new Date());
      const unreadMessages = messages.filter(
        (msg) =>
          msg?.fileMetadata.created >
            (conversation.fileMetadata.appData.content.lastReadTime || 0) &&
          msg.fileMetadata.senderOdinId
      );

      if (!unreadMessages.length) return;
      isProcessing.current = true;

      try {
        // We await the markAsRead (async version), as the mutationStatus isn't shared between hooks;
        // So it can happen that the status would reset in between renders
        await markAsRead({
          conversation: conversation,
          messages: unreadMessages,
        });

        setMessagesMarkedAsRead(true);
      } catch (e) {
        console.error('Error marking messages as read', e);
        setMessagesMarkedAsRead(false);
        isProcessing.current = false;
      }
    })();
  }, [messages]);

  useEffect(() => {
    if (!conversation || !messages) return;

    if (messagesMarkedAsRead && pendingReadTime && conversation) {
      updateConversation({
        conversation: {
          ...conversation,
          fileMetadata: {
            ...conversation.fileMetadata,
            appData: {
              ...conversation.fileMetadata.appData,
              content: {
                ...conversation.fileMetadata.appData.content,
                lastReadTime: pendingReadTime.getTime(),
              },
            },
          },
        },
      });
      setPendingReadTime(undefined);
      setMessagesMarkedAsRead(false);
      isProcessing.current = false;
    }
  }, [messagesMarkedAsRead]);
};
