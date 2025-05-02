import { QueryClient, useQuery } from '@tanstack/react-query';
import {
  ConnectionInfo,
  getConnectionInfo,
  getPendingRequest,
  getSentRequest,
} from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '../auth/useOdinClientContext';

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
export const useConnectionInfo = ({ odinId }: { odinId?: string }) => {
  const odinClient = useOdinClientContext();

  const doGetConnectionInfo = async (odinId: string) => {
    if (!odinId) return null;

    if (!domainRegex.test(odinId)) {
      return null;
    }

    const connectionInfo = await getConnectionInfo(odinClient, odinId);
    if (connectionInfo && connectionInfo.status.toLowerCase() !== 'none')
      return connectionInfo || null;

    return null;
  };

  return {
    fetch: useQuery({
      queryKey: ['connection-info', odinId],
      queryFn: () => doGetConnectionInfo(odinId as string),
      enabled: !!odinId,
      staleTime: 1000 * 5, // 5sec
    }),
  };
};

export const useDetailedConnectionInfo = ({ odinId }: { odinId?: string }) => {
  const odinClient = useOdinClientContext();
  const connectionInfoQuery = useConnectionInfo({ odinId }).fetch;

  const doGetDetailedConnectionInfo = async (odinId: string) => {
    if (!odinId) return;

    const pendingRequest = await getPendingRequest(odinClient, odinId);
    if (pendingRequest) return pendingRequest;

    const sentRequest = await getSentRequest(odinClient, odinId);
    if (sentRequest) return sentRequest;

    return null;
  };

  const detailedConnectionInfoQuery = useQuery({
    queryKey: ['detailed-connection-info', odinId],
    queryFn: () => doGetDetailedConnectionInfo(odinId as string),
    enabled:
      !!odinId &&
      connectionInfoQuery.isFetched &&
      connectionInfoQuery.data?.status.toLowerCase() !== 'connected' &&
      connectionInfoQuery.data?.status.toLowerCase() !== 'blocked',
    staleTime: 1000 * 5, // 5sec
  });

  return {
    fetch:
      connectionInfoQuery.data?.status.toLowerCase() === 'connected' ||
        connectionInfoQuery.data?.status.toLowerCase() === 'blocked' ||
        !connectionInfoQuery.isFetched
        ? connectionInfoQuery
        : detailedConnectionInfoQuery,
  };
};

export const invalidateConnectionInfo = async (queryClient: QueryClient, odinId: string) => {
  await queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
  await queryClient.invalidateQueries({ queryKey: ['detailed-connection-info', odinId] });
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
