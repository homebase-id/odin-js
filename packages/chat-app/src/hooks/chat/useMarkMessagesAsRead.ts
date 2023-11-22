import { useRef } from 'react';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import { useChatMessages } from './useChatMessages';
import { useEffect, useState } from 'react';
import { Conversation } from '../../providers/ConversationProvider';
import { useConversation } from './useConversation';

export const useMarkMessagesAsRead = ({
  conversation,
  messages,
}: {
  conversation: DriveSearchResult<Conversation> | undefined;
  messages: DriveSearchResult<ChatMessage>[] | undefined;
}) => {
  const {
    markAsRead: { mutate: markAsRead, status: markAsReadStatus },
  } = useChatMessages();
  const isTriggeredOnce = useRef(false);

  const { mutate: updateConversation } = useConversation().update;
  const [pendingReadTime, setPendingReadTime] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!conversation || !messages || isTriggeredOnce.current) return;

    setPendingReadTime(new Date());
    const unreadMessages = messages.filter(
      (msg) =>
        msg?.fileMetadata.created > (conversation.fileMetadata.appData.content.lastReadTime || 0) &&
        msg.fileMetadata.senderOdinId
    );

    if (!unreadMessages.length) return;

    isTriggeredOnce.current = true;
    markAsRead({
      conversation: conversation,
      messages: unreadMessages,
    });
  }, [messages]);

  useEffect(() => {
    if (!conversation || !messages) return;

    if (markAsReadStatus === 'success' && pendingReadTime && conversation) {
      conversation.fileMetadata.appData.content.lastReadTime = pendingReadTime.getTime();

      updateConversation({ conversation });
      setPendingReadTime(undefined);
    }
  }, [markAsReadStatus]);
};
