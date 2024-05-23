import { useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import { fetchCircleMembershipStatus } from '../../provider/network/troubleshooting/ConnectionGrantProvider';

export const useConnectionGrantStatus = ({ odinId }: { odinId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchStatus = async (odinId: string) => fetchCircleMembershipStatus(dotYouClient, odinId);
  return {
    fetchStatus: useQuery({
      queryKey: ['connection-grant-status'],
      queryFn: () => fetchStatus(odinId as string),
      enabled: !!odinId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: false,
    }),
  };
};
