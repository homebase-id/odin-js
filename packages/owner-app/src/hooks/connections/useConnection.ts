import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import {
  getConnectionInfo,
  disconnectFromContact,
  getPendingRequest,
  getSentRequest,
  sendRequest,
  deleteSentRequest,
  acceptConnectionRequest,
  deletePendingRequest,
  blockOdinId,
  unblockOdinId,
  ConnectionRequest,
} from '@youfoundation/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';

const useConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();

  const dotYouClient = useAuth().getDotYouClient();

  const fetchSingle = async ({ odinId }: { odinId: string }) => {
    if (!odinId) {
      return;
    }

    const connectionInfo = await getConnectionInfo(dotYouClient, odinId);
    if (connectionInfo && connectionInfo.status.toLowerCase() !== 'none') {
      return connectionInfo;
    }

    const pendingRequest = await getPendingRequest(dotYouClient, odinId);
    if (pendingRequest) {
      return pendingRequest;
    }

    const sentRequest = await getSentRequest(dotYouClient, odinId);
    if (sentRequest) {
      return sentRequest;
    }

    return {} as ConnectionRequest;
  };

  const disconnect = async ({ connectionOdinId }: { connectionOdinId: string }) => {
    return await disconnectFromContact(dotYouClient, connectionOdinId);
  };

  const sendConnectionRequest = async ({
    targetOdinId,
    message,
    name,
    photoFileId,
    circleIds,
  }: {
    targetOdinId: string;
    message: string;
    name: string;
    photoFileId: string | undefined;
    circleIds: string[];
  }) => {
    await sendRequest(dotYouClient, targetOdinId, message, name, photoFileId, circleIds);
    return { targetOdinId };
  };

  const revokeConnectionRequest = async ({ targetOdinId }: { targetOdinId: string }) => {
    return await deleteSentRequest(dotYouClient, targetOdinId);
  };

  const acceptRequest = async ({
    senderOdinId,
    name,
    photoFileId,
    circleIds,
  }: {
    senderOdinId: string;
    name: string;
    photoFileId: string | undefined;
    circleIds: string[];
  }) => {
    await acceptConnectionRequest(dotYouClient, senderOdinId, name, photoFileId, circleIds);

    // Save contact
    const connectionInfo = await fetchConnectionInfo(dotYouClient, senderOdinId);
    if (connectionInfo) await saveContact(dotYouClient, connectionInfo);

    return { senderOdinId };
  };

  const ignoreRequest = async ({ senderOdinId }: { senderOdinId: string }) => {
    return await deletePendingRequest(dotYouClient, senderOdinId);
  };

  const block = async (odinId: string) => {
    return await blockOdinId(dotYouClient, odinId);
  };
  const unblock = async (odinId: string) => {
    return await unblockOdinId(dotYouClient, odinId);
  };

  return {
    fetch: useQuery(['connectionInfo', odinId], () => fetchSingle({ odinId: odinId as string }), {
      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),

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
    acceptRequest: useMutation(acceptRequest, {
      onMutate: async (newRequest) => {
        await queryClient.cancelQueries(['activeConnections']);

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
        queryClient.invalidateQueries(['pendingConnections']);
        queryClient.invalidateQueries(['activeConnections']);
        queryClient.invalidateQueries(['connectionInfo', data?.senderOdinId]);
      },
    }),
    ignoreRequest: useMutation(ignoreRequest, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['pendingConnections']);
        queryClient.invalidateQueries(['connectionInfo', param.senderOdinId]);
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

export default useConnection;
