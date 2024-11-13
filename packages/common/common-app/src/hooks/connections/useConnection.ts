import { useQuery } from '@tanstack/react-query';

import { getDetailedConnectionInfo } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useConnection = ({ odinId }: { odinId?: string }) => {
  const dotYouClient = useDotYouClientContext();

  const doGetConnectionInfo = async (odinId: string) => {
    return (await getDetailedConnectionInfo(dotYouClient, odinId as string)) || null;
  };

  return {
    fetch: useQuery({
      queryKey: ['connection-info', odinId],
      queryFn: () => doGetConnectionInfo(odinId as string),
      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),
  };
};
