import { useQuery } from '@tanstack/react-query';

import { ConnectionInfo, AUTO_CONNECTIONS_CIRCLE_ID } from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useConnection } from './useConnection';

export const useAutoConnection = ({ odinId }: { odinId?: string }) => {
  const {
    fetch: { data: connectionInfo },
  } = useConnection({ odinId: odinId });

  const isUnconfirmedAutoConnected = async () => {
    if (connectionInfo?.status !== 'connected') return false;
    const info = connectionInfo as ConnectionInfo;
    return info.accessGrant.circleGrants.some((grant) => {
      return stringGuidsEqual(grant.circleId, AUTO_CONNECTIONS_CIRCLE_ID);
    });
  };

  return {
    isUnconfirmedAutoConnected: useQuery({
      queryKey: ['unconfirmed-connection', odinId],
      queryFn: () => isUnconfirmedAutoConnected(),
      refetchOnWindowFocus: false,
      enabled: !!connectionInfo,
    }),
  };
};
