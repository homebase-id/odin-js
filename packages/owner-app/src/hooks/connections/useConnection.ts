import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import {
  getConnectionInfo,
  disconnectFromContact,
  getPendingRequest,
  getSentRequest,
  sendRequest,
  deleteSentRequest,
  blockOdinId,
  unblockOdinId,
  ConnectionRequest,
} from '@youfoundation/js-lib/network';
import { DotYouClient } from '@youfoundation/js-lib/core';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';
import { saveContact } from '../../provider/contact/ContactProvider';

export const getDetailedConnectionInfo = async ({
  dotYouClient,
  odinId,
  includeContactData = false,
}: {
  dotYouClient: DotYouClient;
  odinId: string;
  includeContactData?: boolean;
}) => {
  if (!odinId) return;

  const connectionInfo = await getConnectionInfo(dotYouClient, odinId, includeContactData);
  if (connectionInfo && connectionInfo.status.toLowerCase() !== 'none') return connectionInfo;

  const pendingRequest = await getPendingRequest(dotYouClient, odinId);
  if (pendingRequest) return { ...pendingRequest, contactData: connectionInfo?.contactData };

  const sentRequest = await getSentRequest(dotYouClient, odinId);
  if (sentRequest) return { ...sentRequest, contactData: connectionInfo?.contactData };

  return {} as ConnectionRequest;
};

const useConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();

  const dotYouClient = useAuth().getDotYouClient();

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
    fetch: useQuery(
      ['connectionInfo', odinId],
      () => getDetailedConnectionInfo({ dotYouClient, odinId: odinId as string }),
      {
        refetchOnWindowFocus: false,
        enabled: !!odinId,
      }
    ),

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

export default useConnection;
