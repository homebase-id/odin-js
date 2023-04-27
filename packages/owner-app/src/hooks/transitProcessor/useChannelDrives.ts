import { useQuery } from '@tanstack/react-query';
import { BlogConfig, getDrivesByType } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useChannelDrives = () => {
  const { isAuthenticated, getDotYouClient } = useAuth();
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
    enabled: isAuthenticated,
  });
};

export default useChannelDrives;
