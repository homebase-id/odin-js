import { useQuery } from '@tanstack/react-query';
import { getConnectionInfo } from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useIsConnected = (odinId?: string) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const getIsConnected = async (odinId: string) => {
    // Optimize by checking the 'connectionInfo' queryData first

    const connectionInfo = await getConnectionInfo(dotYouClient, odinId);
    return connectionInfo && connectionInfo.status.toLowerCase() === 'connected';
  };

  return useQuery(['isConnected', odinId], () => getIsConnected(odinId as string), {
    enabled: !!odinId,
  });
};
