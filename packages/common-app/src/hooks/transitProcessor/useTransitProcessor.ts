import { useQuery } from '@tanstack/react-query';
import { Notify, TypedConnectionNotification } from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../auth/useDotYouClient';
import { useChannelDrives } from './useChannelDrives';
import { useNotificationSubscriber } from './useNotificationSubscriber';
import { processInbox } from '@youfoundation/js-lib/peer';
import { BlogConfig } from '@youfoundation/js-lib/public';
import { useCallback } from 'react';

const MINUTE_IN_MS = 60000;

// Process the inbox on startup
const useInboxProcessor = (isEnabled?: boolean) => {
  const { data: chnlDrives, isFetchedAfterMount: channelsFetched } = useChannelDrives(
    isEnabled || false
  );
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchData = async () => {
    await processInbox(dotYouClient, BlogConfig.FeedDrive, 5);

    // TODO: needs to be better..
    if (chnlDrives)
      await Promise.all(
        chnlDrives.map(async (chnlDrive) => {
          return await processInbox(dotYouClient, chnlDrive.targetDriveInfo, 5);
        })
      );

    return true;
  };

  return useQuery({
    queryKey: ['processInbox'],
    queryFn: fetchData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: MINUTE_IN_MS * 60,
    enabled: isEnabled && channelsFetched,
  });
};

export const useTransitProcessor = (isEnabled = true) => {
  useInboxProcessor(isEnabled);

  const handler = useCallback((notification: TypedConnectionNotification) => {
    if (notification.notificationType === 'transitFileReceived') {
      console.debug(
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
  }, []);

  useNotificationSubscriber(isEnabled ? handler : undefined, ['transitFileReceived']);

  return;
};
