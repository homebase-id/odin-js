import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { useConnection } from './useConnection';
import {
  ConnectionInfo,
  confirmIntroduction,
  AUTO_CONNECTIONS_CIRCLE_ID,
} from '@youfoundation/js-lib/network';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const useAutoConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();
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

  const doConfirmAutoConnection = async (odinId: string) => {
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
