import { useQuery } from '@tanstack/react-query';
import {
  BlogConfig,
  Notify,
  processInbox,
  TypedConnectionNotification,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
import useChannelsDrives from './useChannelDrives';
import useNotificationSubscriber from './useNotificationSubscriber';

const MINUTE_IN_MS = 60000;

// Process the inbox on startup
const useInboxProcessor = (isEnabled?: boolean) => {
  const { data: chnlDrives, isFetchedAfterMount: channelsFetched } = useChannelsDrives();
  const dotYouClient = useAuth().getDotYouClient();

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
  return useQuery(['processInbox'], fetchData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: MINUTE_IN_MS * 60,
    enabled: isEnabled && channelsFetched,
  });
};

const useTransitProcessor = (isEnabled = true) => {
  useInboxProcessor(isEnabled);

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
  };

  useNotificationSubscriber(isEnabled ? handler : undefined, ['transitFileReceived']);

  return;
};

export default useTransitProcessor;
