import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { MailConversation } from '../../providers/MailProvider';
import { useEffect, useRef } from 'react';
import { useMailConversation } from './useMailConversation';

export const useMarkMailConversationsAsRead = ({
  mailThread,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
}) => {
  // We really want this to only run once
  const isProcessing = useRef(false);

  const { mutateAsync: markAsRead } = useMailConversation().markAsRead;

  useEffect(() => {
    (async () => {
      if (!mailThread || isProcessing.current) return;
      isProcessing.current = true;

      // We await the markAsRead (async version), as the mutationStatus isn't shared between hooks;
      // So it can happen that the status would reset in between renders
      await markAsRead({
        mailConversations: mailThread,
      });
    })();
  }, [mailThread]);
};
