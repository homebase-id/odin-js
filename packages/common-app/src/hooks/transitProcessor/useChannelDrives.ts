import { useQuery } from '@tanstack/react-query';
import { BlogConfig, getDrivesByType } from '@youfoundation/js-lib';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useChannelDrives = (isEnabled: boolean) => {
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();

  const fetchChannelData = async () => {
    return await (
      await getDrivesByType(dotYouClient, BlogConfig.DriveType, 1, 25)
    ).results;
  };

  return useQuery(['channel-drives'], fetchChannelData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled: isEnabled,
  });
};
