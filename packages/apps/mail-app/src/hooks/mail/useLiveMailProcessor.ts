import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { DotYouClient, TypedConnectionNotification } from '@homebase-id/js-lib/core';

import { processInbox } from '@homebase-id/js-lib/peer';

import { useWebsocketSubscriber } from '@homebase-id/common-app';
import { useCallback } from 'react';

import { hasDebugFlag, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  MAIL_CONVERSATION_FILE_TYPE,
  MailConversationsReturn,
  MailDrive,
  dsrToMailConversation,
} from '../../providers/MailProvider';
import { websocketDrives } from '../auth/useAuth';

// We first process the inbox, then we connect for live updates;
export const useLiveMailProcessor = () => {
  // Process the inbox on startup; As we want to cover the backlog of messages first
  const { status: inboxStatus } = useInboxProcessor(true);

  // Only after the inbox is processed, we connect for live updates; So we avoid clearing the cache on each fileAdded update
  const isOnline = useMailWebsocket(inboxStatus === 'success');

  return isOnline;
};

// Process the inbox on startup
const useInboxProcessor = (connected?: boolean) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchData = async () => {
    const processedresult = await processInbox(dotYouClient, MailDrive, 2000);
    // We don't know how many messages we have processed, so we can only invalidate the entire mail query
    // TODO: Extend with a queryBatch + queryModified with a timestamp check to directly add the new messages into the cache
    queryClient.invalidateQueries({ queryKey: ['mail-conversations'] });
    return processedresult;
  };

  return useQuery({
    queryKey: ['process-mail-inbox'],
    queryFn: fetchData,
    staleTime: 1000, // 1s to avoid duplicate requests on the same page load
    enabled: connected,
  });
};

const isDebug = hasDebugFlag();

const useMailWebsocket = (isEnabled: boolean) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const handler = useCallback(
    async (_: DotYouClient, notification: TypedConnectionNotification) => {
      isDebug && console.debug('[MailWebsocket] Got notification', notification);

      if (
        notification.notificationType === 'fileAdded' ||
        notification.notificationType === 'fileModified'
      ) {
        if (notification.header.fileMetadata.appData.fileType === MAIL_CONVERSATION_FILE_TYPE) {
          const isNewFile = notification.notificationType === 'fileAdded';

          // This skips the invalidation of all chat messages, as we only need to add/update this specific message
          const updatedChatMessage = await dsrToMailConversation(
            dotYouClient,
            notification.header,
            MailDrive,
            true
          );
          if (!updatedChatMessage) return;

          const existingConversations = queryClient.getQueryData<
            InfiniteData<MailConversationsReturn>
          >(['mail-conversations']);

          if (existingConversations) {
            const newConversations = {
              ...existingConversations,
              pages: existingConversations?.pages?.map((page, index) => ({
                ...page,
                results: isNewFile
                  ? index === 0
                    ? [
                        updatedChatMessage,
                        ...page.results.filter(
                          (existingMail) =>
                            !stringGuidsEqual(existingMail.fileId, updatedChatMessage.fileId)
                        ),
                      ]
                    : page.results
                  : page.results.map((msg) =>
                      stringGuidsEqual(msg?.fileId, updatedChatMessage.fileId)
                        ? updatedChatMessage
                        : msg
                    ),
              })),
            };
            queryClient.setQueryData(['mail-conversations'], newConversations);
          }

          queryClient.setQueryData(['mail-message', updatedChatMessage.fileId], updatedChatMessage);
        }
      }
    },
    []
  );

  return useWebsocketSubscriber(
    isEnabled ? handler : undefined,
    undefined,
    ['fileAdded', 'fileModified'],
    websocketDrives,
    () => queryClient.invalidateQueries({ queryKey: ['process-mail-inbox'] }),
    () => queryClient.invalidateQueries({ queryKey: ['process-mail-inbox'] }),
    'useLiveMailProcessor'
  );
};
