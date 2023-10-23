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
import useAuth from '../auth/useAuth';

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
    disconnect: useMutation(disconnect, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['activeConnections']);
        queryClient.invalidateQueries(['connectionInfo', param.connectionOdinId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    sendConnectionRequest: useMutation(sendConnectionRequest, {
      onMutate: async (newRequest) => {
        await queryClient.cancelQueries(['sentRequests']);

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
        queryClient.invalidateQueries(['sentRequests']);
        queryClient.invalidateQueries(['connectionInfo', data?.targetOdinId]);
      },
    }),
    revokeConnectionRequest: useMutation(revokeConnectionRequest, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['sentRequests']);
        queryClient.invalidateQueries(['connectionInfo', param.targetOdinId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    block: useMutation(block, {
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries(['pendingConnections']);
        queryClient.invalidateQueries(['activeConnections']);
        queryClient.invalidateQueries(['connectionInfo', odinId]);
      },
    }),
    unblock: useMutation(unblock, {
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries(['pendingConnections']);
        queryClient.invalidateQueries(['activeConnections']);
        queryClient.invalidateQueries(['connectionInfo', odinId]);
      },
    }),
  };
};
