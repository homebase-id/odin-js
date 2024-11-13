import { AUTO_CONNECTIONS_CIRCLE_ID } from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useConnection } from './useConnection';

export const useAutoConnection = ({ odinId }: { odinId?: string }) => {
  const { fetch: connectionInfoQuery } = useConnection({ odinId: odinId });

  return {
    isUnconfirmedAutoConnected: {
      ...connectionInfoQuery,
      data:
        connectionInfoQuery.data?.status === 'connected' &&
        connectionInfoQuery.data?.accessGrant.circleGrants.some((grant) =>
          stringGuidsEqual(grant.circleId, AUTO_CONNECTIONS_CIRCLE_ID)
        ),
    },
  };
};
