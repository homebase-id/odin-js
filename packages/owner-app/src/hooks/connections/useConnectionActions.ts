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
import { PagedResult, SecurityGroupType } from '@homebase-id/js-lib/core';
import { getNewId } from '@homebase-id/js-lib/helpers';

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
        queryClient.invalidateQueries({ queryKey: ['active-connections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.connectionOdinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    sendConnectionRequest: useMutation({
      mutationFn: sendConnectionRequest,
      onMutate: async ({ targetOdinId, message }) => {
        await queryClient.cancelQueries({ queryKey: ['sent-requests'] });

        const previousRequests = queryClient.getQueryData<PagedResult<ConnectionRequest>>([
          'sent-requests',
        ]);

        const newRequest: ConnectionRequest = {
          status: 'sent',
          recipient: targetOdinId,
          id: getNewId(),
          message: message,
          senderOdinId: dotYouClient.getIdentity(),
          receivedTimestampMilliseconds: Date.now(),
        };
        queryClient.setQueryData<PagedResult<ConnectionRequest>>(['sent-requests'], {
          totalPages: 0,
          ...previousRequests,
          results: [newRequest, ...(previousRequests?.results || [])],
        });

        return { previousRequests, newRequest };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['sent-requests'], context?.previousRequests);
      },
      onSettled: (data) => {
        queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', data?.targetOdinId] });
      },
    }),
    revokeConnectionRequest: useMutation({
      mutationFn: revokeConnectionRequest,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['sent-requests'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.targetOdinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    block: useMutation({
      mutationFn: block,
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
        queryClient.invalidateQueries({ queryKey: ['active-connections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
      },
    }),
    unblock: useMutation({
      mutationFn: unblock,
      onSettled: (_data, _err, odinId) => {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
        queryClient.invalidateQueries({ queryKey: ['active-connections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
      },
    }),
  };
};
