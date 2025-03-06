import { HomebaseFile } from '@homebase-id/js-lib/core';
import { MailConversation } from '../../providers/MailProvider';
import { useEffect, useMemo, useRef } from 'react';
import { useMailConversation } from './useMailConversation';
import { useDotYouClient } from '@homebase-id/common-app';

export const useMarkMailConversationsAsRead = ({
  mailThread,
}: {
  mailThread: HomebaseFile<MailConversation>[];
}) => {
  // We really want this to only run once
  const isProcessing = useRef(false);
  const identity = useDotYouClient().getDotYouClient().getLoggedInIdentity();
  const { mutateAsync: markAsRead } = useMailConversation().markAsRead;

  const unreadMessages = useMemo(
    () =>
      mailThread.filter(
        (msg) =>
          !msg.fileMetadata.appData.content.isRead && msg.fileMetadata.originalAuthor !== identity
      ),
    [mailThread]
  );

  useEffect(() => {
    (async () => {
      if (!unreadMessages || !unreadMessages.length || isProcessing.current) return;
      isProcessing.current = true;

      // We await the markAsRead (async version), as the mutationStatus isn't shared between hooks;
      // So it can happen that the status would reset in between renders
      await markAsRead({
        mailConversations: unreadMessages,
      });

      isProcessing.current = false;
    })();
  }, [unreadMessages]);
};
