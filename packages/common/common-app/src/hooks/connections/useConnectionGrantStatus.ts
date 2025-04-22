import { QueryClient, useQuery } from '@tanstack/react-query';
import { fetchCircleMembershipStatus } from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useConnectionGrantStatus = ({ odinId }: { odinId?: string }) => {
  const odinClient = useOdinClientContext();

  const fetchStatus = async (odinId: string) => fetchCircleMembershipStatus(odinClient, odinId);
  return {
    fetchStatus: useQuery({
      queryKey: ['connection-grant-status', odinId],
      queryFn: () => fetchStatus(odinId as string),
      enabled: !!odinId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),
  };
};

export const invalidateConnectionGrantStatus = async (queryClient: QueryClient, odinId: string) => {
  await queryClient.invalidateQueries({ queryKey: ['connection-grant-status', odinId] });
};
