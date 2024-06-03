import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  ConnectionRequest,
  acceptConnectionRequest,
  deletePendingRequest,
  getPendingRequest,
} from '@youfoundation/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';
import { SecurityGroupType } from '@youfoundation/js-lib/core';

export const usePendingConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const getPendingConnectionInfo = async ({ odinId }: { odinId: string }) => {
    if (!odinId) return null;

    return await getPendingRequest(dotYouClient, odinId);
  };

  const acceptRequest = async ({
    senderOdinId,
    circleIds,
  }: {
    senderOdinId: string;
    circleIds: string[];
  }) => {
    await acceptConnectionRequest(dotYouClient, senderOdinId, circleIds);

    // Save contact
    const connectionInfo = await fetchConnectionInfo(dotYouClient, senderOdinId);
    if (connectionInfo)
      await saveContact(dotYouClient, {
        fileMetadata: { appData: { content: connectionInfo } },
        serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner } },
      });

    return { senderOdinId };
  };

  const ignoreRequest = async ({ senderOdinId }: { senderOdinId: string }) => {
    return await deletePendingRequest(dotYouClient, senderOdinId);
  };

  return {
    fetch: useQuery({
      queryKey: ['pendingConnection', odinId],
      queryFn: () => getPendingConnectionInfo({ odinId: odinId as string }),

      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),
    acceptRequest: useMutation({
      mutationFn: acceptRequest,
      onMutate: async (newRequest) => {
        await queryClient.cancelQueries({ queryKey: ['activeConnections'] });

        const previousConnections: ConnectionRequest[] | undefined = queryClient.getQueryData([
          'activeConnections',
        ]);
        const newConnections = [
          {
            status: 'pending', // Set to pending to not update the connetion details page yet, as we don't have the data for that
            odinId: newRequest.senderOdinId,
          },
          ...(previousConnections ?? []),
        ];

        queryClient.setQueryData(['activeConnections'], newConnections);

        return { previousConnections, newRequest };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['activeConnections'], context?.previousConnections);
      },
      onSettled: (data) => {
        queryClient.invalidateQueries({ queryKey: ['pendingConnections'] });
        queryClient.invalidateQueries({ queryKey: ['pendingConnection', data?.senderOdinId] });
        queryClient.invalidateQueries({ queryKey: ['activeConnections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', data?.senderOdinId] });
      },
    }),
    ignoreRequest: useMutation({
      mutationFn: ignoreRequest,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['pendingConnections'] });
        queryClient.invalidateQueries({ queryKey: ['pendingConnection', param.senderOdinId] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.senderOdinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
