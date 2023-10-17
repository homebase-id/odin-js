import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConnectionInfo,
  ConnectionRequest,
  getConnectionInfo,
} from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useIsConnected = (odinId?: string) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getIsConnected = async (odinId: string) => {
    const fullConnectionInfo = queryClient.getQueryData<ConnectionInfo | ConnectionRequest | null>([
      'connectionInfo',
      odinId,
    ]);
    if (fullConnectionInfo?.status === 'connected') return true;

    const connectionInfo = await getConnectionInfo(dotYouClient, odinId);
    return connectionInfo && connectionInfo.status.toLowerCase() === 'connected';
  };

  return useQuery(['isConnected', odinId], () => getIsConnected(odinId as string), {
    enabled: !!odinId,
    cacheTime: 10 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
