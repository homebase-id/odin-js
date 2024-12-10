import { useChannelDrives } from '@homebase-id/common-app';
import { BlogConfig } from '@homebase-id/js-lib/public';

export const useWebsocketDrives = () => {
  const { data: channelDrives, isFetched } = useChannelDrives(true);

  if (!isFetched) return null;

  return [BlogConfig.FeedDrive, ...(channelDrives || []).map((def) => def.targetDriveInfo)];
};
