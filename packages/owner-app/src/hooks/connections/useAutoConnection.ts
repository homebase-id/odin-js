import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';

import {
  ConnectionInfo,
  confirmIntroduction,
  AUTO_CONNECTIONS_CIRCLE_ID,
} from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useConnection, useFollowingInfinite } from '@homebase-id/common-app';

export const useAutoConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();
  const {
    fetch: { data: connectionInfo },
  } = useConnection({ odinId: odinId });

  const { mutateAsync: follow } = useFollowingInfinite().follow;

  const isUnconfirmedAutoConnected = async () => {
    if (connectionInfo?.status !== 'connected') return false;
    const info = connectionInfo as ConnectionInfo;
    return info.accessGrant.circleGrants.some((grant) => {
      return stringGuidsEqual(grant.circleId, AUTO_CONNECTIONS_CIRCLE_ID);
    });
  };

  const doConfirmAutoConnection = async ({
    odinId,
    autoFollow,
  }: {
    odinId: string;
    autoFollow?: boolean;
  }) => {
    if (autoFollow) {
      await follow({
        request: { odinId, notificationType: 'allNotifications' },
        includeHistory: true,
      });
    }

    return confirmIntroduction(dotYouClient, odinId);
  };

  return {
    isUnconfirmedAutoConnected: useQuery({
      queryKey: ['unconfirmed-connection', odinId],
      queryFn: () => isUnconfirmedAutoConnected(),
      refetchOnWindowFocus: false,
      enabled: !!connectionInfo,
    }),
    confirmAutoConnection: useMutation({
      mutationFn: doConfirmAutoConnection,
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
        await queryClient.invalidateQueries({ queryKey: ['unconfirmed-connection', odinId] });
      },
    }),
  };
};
