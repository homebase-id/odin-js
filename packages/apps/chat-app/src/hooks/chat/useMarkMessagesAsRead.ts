import { useRef } from 'react';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../providers/ChatProvider';
import { useChatMessages } from './useChatMessages';
import { useEffect, useState } from 'react';
import { UnifiedConversation } from '../../providers/ConversationProvider';
import { useConversationMetadata } from './useConversationMetadata';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useMarkMessagesAsRead = ({
  conversation,
  messages,
}: {
  conversation: HomebaseFile<UnifiedConversation> | undefined;
  messages: HomebaseFile<ChatMessage>[] | undefined;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const { mutateAsync: markAsRead } = useChatMessages({
    conversationId: conversation?.fileMetadata.appData.uniqueId,
  }).markAsRead;
  const isProcessing = useRef(false);
  const [messagesMarkedAsRead, setMessagesMarkedAsRead] = useState<boolean>(false);

  const {
    single: { data: conversationMetadata },
    update: { mutate: updateConversationMetadata },
  } = useConversationMetadata({ conversationId: conversation?.fileMetadata.appData.uniqueId });
  const [pendingReadTime, setPendingReadTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      if (!conversation || !conversationMetadata || !messages || isProcessing.current) return;

      const unreadMessages = messages.filter(
        (msg) =>
          (msg?.fileMetadata.transitCreated || msg?.fileMetadata.created) >
            (conversationMetadata.lastReadTime || 0) &&
          (!msg.fileMetadata.senderOdinId || msg.fileMetadata.senderOdinId !== loggedOnIdentity)
      );

      const newestMessageCreated = unreadMessages.reduce((acc, msg) => {
        return (msg?.fileMetadata.transitCreated || msg.fileMetadata.created) > acc
          ? msg?.fileMetadata.transitCreated || msg.fileMetadata.created
          : acc;
      }, conversationMetadata.lastReadTime || 0);

      setPendingReadTime(newestMessageCreated);

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
  }, [conversationMetadata, messages]);

  useEffect(() => {
    if (!conversation || !conversationMetadata || !messages || !pendingReadTime) return;
    if (conversationMetadata.lastReadTime === pendingReadTime) return;

    if (messagesMarkedAsRead && pendingReadTime && conversationMetadata) {
      updateConversationMetadata({
        conversation,
        newMetadata: {
          ...conversationMetadata,
          lastReadTime: pendingReadTime,
        },
      });
      setPendingReadTime(undefined);
      setMessagesMarkedAsRead(false);
      isProcessing.current = false;
    }
  }, [messagesMarkedAsRead]);
};
