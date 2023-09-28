import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import {
  ConnectionRequest,
  acceptConnectionRequest,
  deletePendingRequest,
  getPendingRequest,
} from '@youfoundation/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';

const usePendingConnection = ({ odinId }: { odinId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const getDetailedConnectionInfo = async ({ odinId }: { odinId: string }) => {
    if (!odinId) return;

    return await getPendingRequest(dotYouClient, odinId);
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

  return {
    fetch: useQuery(
      ['pendingConnection', odinId],
      () => getDetailedConnectionInfo({ odinId: odinId as string }),
      {
        refetchOnWindowFocus: false,
        enabled: !!odinId,
      }
    ),
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
        queryClient.invalidateQueries(['pendingConnection', data?.senderOdinId]);
        queryClient.invalidateQueries(['activeConnections']);
        queryClient.invalidateQueries(['connectionInfo', data?.senderOdinId]);
      },
    }),
    ignoreRequest: useMutation(ignoreRequest, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['pendingConnections']);
        queryClient.invalidateQueries(['pendingConnection', param.senderOdinId]);
        queryClient.invalidateQueries(['connectionInfo', param.senderOdinId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default usePendingConnection;
