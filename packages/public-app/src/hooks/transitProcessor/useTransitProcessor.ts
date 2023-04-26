import { useQuery } from '@tanstack/react-query';
import {
  ApiType,
  BlogConfig,
  DotYouClient,
  GetTargetDriveFromChannelId,
  Notify,
  processInbox,
  TypedConnectionNotification,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
import useChannels from '../blog/useChannels';

import useNotificationSubscriber from './useNotificationSubscriber';

const MINUTE_IN_MS = 60000;

// Process the inbox on startup
const useInboxProcessor = (isEnabled?: boolean) => {
  const { data: channels, isFetchedAfterMount: channelsFetched } = useChannels();
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchData = async () => {
    await processInbox(dotYouClient, BlogConfig.FeedDrive, 5);

    // TODO: needs to be better..
    if (channels)
      await Promise.all(
        channels.map(async (chnl) => {
          return await processInbox(dotYouClient, GetTargetDriveFromChannelId(chnl.channelId), 5);
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
