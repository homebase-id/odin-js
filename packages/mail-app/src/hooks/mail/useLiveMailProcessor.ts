import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TypedConnectionNotification } from '@youfoundation/js-lib/core';

import { processInbox } from '@youfoundation/js-lib/peer';

import { useNotificationSubscriber } from '@youfoundation/common-app';
import { useCallback } from 'react';

import { hasDebugFlag } from '@youfoundation/js-lib/helpers';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import { MAIL_CONVERSATION_FILE_TYPE, MailDrive } from '../../providers/MailProvider';

const MINUTE_IN_MS = 60000;

// We first process the inbox, then we connect for live updates;
export const useLiveMailProcessor = () => {
  // Process the inbox on startup; As we want to cover the backlog of messages first
  const { status: inboxStatus } = useInboxProcessor(true);

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useMailWebsocket(inboxStatus === 'success');

  // Only after the inbox is processed, we process commands as new ones might have been added via the inbox
  //   useChatCommandProcessor(inboxStatus === 'success');

  return isOnline;
};

// Process the inbox on startup
const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchData = async () => {
    const processedresult = await processInbox(dotYouClient, MailDrive, 2000);
    // We don't know how many messages we have processed, so we can only invalidate the entire chat query
    queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
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

const useMailWebsocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();

  const handler = useCallback(async (notification: TypedConnectionNotification) => {
    isDebug && console.debug('[ChatWebsocket] Got notification', notification);

    if (
      notification.notificationType === 'fileAdded' ||
      notification.notificationType === 'fileModified'
    ) {
      if (notification.header.fileMetadata.appData.fileType === MAIL_CONVERSATION_FILE_TYPE) {
        const threadId = notification.header.fileMetadata.appData.groupId;
        queryClient.invalidateQueries({ queryKey: ['mail-thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
      }
    }
  }, []);

  return useNotificationSubscriber(
    isEnabled ? handler : undefined,
    ['fileAdded', 'fileModified'],
    [MailDrive],
    () => {
      queryClient.invalidateQueries({ queryKey: ['processInbox'] });
    }
  );
};