import { useDotYouClientContext } from '@homebase-id/common-app';
import { getDrivesByType } from '@homebase-id/js-lib/core';
import { COMMUNITY_DRIVE_TYPE } from '../../providers/CommunityDefinitionProvider';
import { useQuery } from '@tanstack/react-query';

export const useLocalCommunityDrives = (isEnabled: boolean) => {
  const dotYouClient = useDotYouClientContext();

  const fetchChannelData = async () => {
    return (await getDrivesByType(dotYouClient, COMMUNITY_DRIVE_TYPE, 1, 100)).results;
  };

  return useQuery({
    queryKey: ['local-community-drives'],
    queryFn: fetchChannelData,
    staleTime: 500, // 0.5 second, just to avoid loading this data too often per page load
    enabled: isEnabled,
  });
};
