import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  disconnectFromContact,
  sendRequest,
  deleteSentRequest,
  blockOdinId,
  unblockOdinId,
  ConnectionRequest,
} from '@homebase-id/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';
import { useAuth } from '../auth/useAuth';
import { SecurityGroupType } from '@homebase-id/js-lib/core';

export const useConnectionActions = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const disconnect = async ({ connectionOdinId }: { connectionOdinId: string }) => {
    return await disconnectFromContact(dotYouClient, connectionOdinId);
  };

  const sendConnectionRequest = async ({
    targetOdinId,
    message,
    circleIds,
  }: {
    targetOdinId: string;
    message: string;
    circleIds: string[];
  }) => {
    await sendRequest(dotYouClient, targetOdinId, message, circleIds);

    // Save contact
    const connectionInfo = await fetchConnectionInfo(dotYouClient, targetOdinId);
    if (connectionInfo)
      await saveContact(dotYouClient, {
        fileMetadata: { appData: { content: connectionInfo } },
        serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner } },
      });

    return { targetOdinId };
  };

  const revokeConnectionRequest = async ({ targetOdinId }: { targetOdinId: string }) => {
    return await deleteSentRequest(dotYouClient, targetOdinId);
  };

  const block = async (odinId: string) => {
    return await blockOdinId(dotYouClient, odinId);
  };
  const unblock = async (odinId: string) => {
    return await unblockOdinId(dotYouClient, odinId);
  };

  return {
    disconnect: useMutation({
      mutationFn: disconnect,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['activeConnections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.connectionOdinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    sendConnectionRequest: useMutation({
      mutationFn: sendConnectionRequest,
      onMutate: async (newRequest) => {
        await queryClient.cancelQueries({ queryKey: ['sentRequests'] });

        const previousRequests: ConnectionRequest[] | undefined = queryClient.getQueryData([
          'sentRequests',
        ]);
        const newRequests = [
          {
            status: 'sent',
            recipient: newRequest.targetOdinId,
          },
          ...(previousRequests ?? []),
        ];

        queryClient.setQueryData(['sentRequests'], newRequests);

        return { previousRequests, newRequest };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['sentRequests'], context?.previousRequests);
      },
      onSettled: (data) => {
        queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', data?.targetOdinId] });
      },
    }),
    revokeConnectionRequest: useMutation({
      mutationFn: revokeConnectionRequest,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.targetOdinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    block: useMutation({
      mutationFn: block,
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries({ queryKey: ['pendingConnections'] });
        queryClient.invalidateQueries({ queryKey: ['activeConnections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
      },
    }),
    unblock: useMutation({
      mutationFn: unblock,
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries({ queryKey: ['pendingConnections'] });
        queryClient.invalidateQueries({ queryKey: ['activeConnections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
      },
    }),
  };
};
