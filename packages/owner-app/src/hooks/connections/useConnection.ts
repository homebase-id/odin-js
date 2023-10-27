import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { getDetailedConnectionInfo } from '@youfoundation/js-lib/network';

export const useConnection = ({ odinId }: { odinId?: string }) => {
  const dotYouClient = useAuth().getDotYouClient();

  const doGetConnectionInfo = async (odinId: string) => {
    return (await getDetailedConnectionInfo(dotYouClient, odinId as string)) || null;
  };

  return {
    fetch: useQuery(['connectionInfo', odinId], () => doGetConnectionInfo(odinId as string), {
      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),
  };
};
