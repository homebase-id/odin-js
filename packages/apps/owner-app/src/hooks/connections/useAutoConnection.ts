import { useMutation, useQueryClient } from '@tanstack/react-query';

import { confirmIntroduction, AUTO_CONNECTIONS_CIRCLE_ID } from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  invalidateConnectionInfo,
  updateCachedConnectionInfo,
  useConnection,
  useDotYouClientContext,
  useFollowingInfinite,
} from '@homebase-id/common-app';

export const useAutoConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();
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
        odinId && invalidateConnectionInfo(queryClient, odinId);
      },
      onMutate: async ({ odinId }) => {
        return {
          previousConnectionInfo: await updateCachedConnectionInfo(queryClient, odinId, (info) => ({
            ...info,
            status: 'connected',
            accessGrant: {
              ...info.accessGrant,
              circleGrants: info.accessGrant.circleGrants.filter(
                (circle) => !stringGuidsEqual(circle.circleId, AUTO_CONNECTIONS_CIRCLE_ID)
              ),
            },
          })),
        };
      },
      onError(err, variables, context) {
        if (context?.previousConnectionInfo) {
          const previousConnectionInfo = context.previousConnectionInfo;
          updateCachedConnectionInfo(queryClient, variables.odinId, () => previousConnectionInfo);
        }
      },
    }),
  };
};
