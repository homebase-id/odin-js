import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ConnectionInfo, ConnectionRequest, getConnectionInfo } from '@homebase-id/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useIsConnected = (odinId?: string) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getIsConnected = async (odinId: string) => {
    const fullConnectionInfo = queryClient.getQueryData<ConnectionInfo | ConnectionRequest | null>([
      'connection-info',
      odinId,
    ]);
    if (fullConnectionInfo?.status === 'connected') return true;
    try {
      const connectionInfo = await getConnectionInfo(dotYouClient, odinId);
      return connectionInfo && connectionInfo.status.toLowerCase() === 'connected';
    } catch (e) {
      console.warn('[useIsConnected] failed to fetch connection', e);
      return null;
    }
  };

  return useQuery({
    queryKey: ['isConnected', odinId],
    queryFn: () => getIsConnected(odinId as string),
    enabled: !!odinId,
    staleTime: 1000 * 60 * 60 * 1, // 1h
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
