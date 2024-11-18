import { QueryClient, useQuery } from '@tanstack/react-query';

import { ConnectionInfo, getDetailedConnectionInfo } from '@homebase-id/js-lib/network';
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

export const invalidateConnectionInfo = async (queryClient: QueryClient, odinId: string) => {
  await queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
};

export const updateCachedConnectionInfo = (
  queryClient: QueryClient,
  odinId: string,
  transformFn: (info: ConnectionInfo) => ConnectionInfo
): ConnectionInfo | undefined => {
  const queryData = queryClient.getQueryData<ConnectionInfo>(['connection-info', odinId]);
  if (!queryData) return;
  queryClient.setQueryData(['connection-info', odinId], transformFn(queryData));

  return { ...queryData };
};
