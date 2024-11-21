import { useQuery } from '@tanstack/react-query';
import { BlogConfig } from '@homebase-id/js-lib/public';
import { getDrivesByType } from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

export const useChannelDrives = (isEnabled: boolean) => {
  const dotYouClient = useDotYouClientContext();

  const fetchChannelData = async () => {
    return await (
      await getDrivesByType(dotYouClient, BlogConfig.DriveType, 1, 25)
    ).results;
  };

  return useQuery({
    queryKey: ['channel-drives'],
    queryFn: fetchChannelData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled: isEnabled,
  });
};
