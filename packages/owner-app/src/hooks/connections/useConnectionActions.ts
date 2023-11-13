import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  disconnectFromContact,
  sendRequest,
  deleteSentRequest,
  blockOdinId,
  unblockOdinId,
  ConnectionRequest,
} from '@youfoundation/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';
import { useAuth } from '../auth/useAuth';

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
    if (connectionInfo) await saveContact(dotYouClient, connectionInfo);

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
        queryClient.invalidateQueries({ queryKey: ['connectionInfo', param.connectionOdinId] });
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
        queryClient.invalidateQueries({ queryKey: ['connectionInfo', data?.targetOdinId] });
      },
    }),
    revokeConnectionRequest: useMutation({
      mutationFn: revokeConnectionRequest,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
        queryClient.invalidateQueries({ queryKey: ['connectionInfo', param.targetOdinId] });
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
        queryClient.invalidateQueries({ queryKey: ['connectionInfo', odinId] });
      },
    }),
    unblock: useMutation({
      mutationFn: unblock,
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries({ queryKey: ['pendingConnections'] });
        queryClient.invalidateQueries({ queryKey: ['activeConnections'] });
        queryClient.invalidateQueries({ queryKey: ['connectionInfo', odinId] });
      },
    }),
  };
};
