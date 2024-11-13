import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { fetch: connectionInfoQuery } = useConnection({ odinId: odinId });

  const { mutateAsync: follow } = useFollowingInfinite().follow;

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
    isUnconfirmedAutoConnected: {
      ...connectionInfoQuery,
      data:
        connectionInfoQuery.data?.status === 'connected' &&
        connectionInfoQuery.data?.accessGrant.circleGrants.some((grant) =>
          stringGuidsEqual(grant.circleId, AUTO_CONNECTIONS_CIRCLE_ID)
        ),
    },
    confirmAutoConnection: useMutation({
      mutationFn: doConfirmAutoConnection,
      onSettled: async () => {
        await queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
      },
      onMutate: async ({ odinId }) => {
        const previousConnectionInfo = queryClient.getQueryData<ConnectionInfo>([
          'connection-info',
          odinId,
        ]);

        if (!previousConnectionInfo) return;

        queryClient.setQueryData<ConnectionInfo>(['connection-info', odinId], {
          ...previousConnectionInfo,
          status: 'connected',
          accessGrant: {
            ...previousConnectionInfo.accessGrant,
            circleGrants: previousConnectionInfo.accessGrant.circleGrants.filter(
              (circle) => !stringGuidsEqual(circle.circleId, AUTO_CONNECTIONS_CIRCLE_ID)
            ),
          },
        });

        return { previousConnectionInfo };
      },
      onError(err, variables, context) {
        if (context?.previousConnectionInfo) {
          queryClient.setQueryData<ConnectionInfo>(
            ['connection-info', variables.odinId],
            context.previousConnectionInfo
          );
        }
      },
    }),
  };
};
