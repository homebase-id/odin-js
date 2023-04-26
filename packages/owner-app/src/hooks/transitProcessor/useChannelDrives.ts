import { useQuery } from '@tanstack/react-query';
import { BlogConfig, DotYouClient, getDrivesByType } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useChannelDrives = () => {
  const { getApiType, getSharedSecret, isAuthenticated } = useAuth();
  const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

  const fetchChannelData = async () => {
    return await (
      await getDrivesByType(dotYouClient, BlogConfig.DriveType, 1, 25)
    ).results;
  };

  return useQuery(['channel-drives'], fetchChannelData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled: isAuthenticated,
  });
};

export default useChannelDrives;
