import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Notify, TypedConnectionNotification } from '@youfoundation/js-lib/core';

import { processInbox } from '@youfoundation/js-lib/transit';
import { ChatDrive } from '../../providers/ConversationProvider';
import { useDotYouClient, useNotificationSubscriber } from '@youfoundation/common-app';
import { preAuth } from '@youfoundation/js-lib/auth';
import { useEffect } from 'react';
import { ChatMessageFileType } from '../../providers/ChatProvider';

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
  useInboxProcessor(isEnabled);
  const queryClient = useQueryClient();

  const dotYouClient = useDotYouClient().getDotYouClient();

  useEffect(() => {
    preAuth(dotYouClient);
  }, []);

  const handler = (notification: TypedConnectionNotification) => {
    if (notification.notificationType === 'transitFileReceived') {
      console.log(
        '[TransitProcessor] Replying to TransitFileReceived by sending processTransitInstructions for the targetDrive'
      );

      Notify({
        command: 'processInbox',
        data: JSON.stringify({
          targetDrive: notification.externalFileIdentifier.targetDrive,
          batchSize: 1,
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
      }
    }
  };

  useNotificationSubscriber(
    isEnabled ? handler : undefined,
    ['transitFileReceived', 'fileAdded'],
    [ChatDrive]
  );
};
