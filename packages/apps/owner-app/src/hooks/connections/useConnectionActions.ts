import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  disconnectFromContact,
  sendRequest,
  deleteSentRequest,
  blockOdinId,
  unblockOdinId,
  ConnectionRequest,
} from '@homebase-id/js-lib/network';
import { SecurityGroupType } from '@homebase-id/js-lib/core';
import { getNewId } from '@homebase-id/js-lib/helpers';
import {
  fetchConnectionInfo,
  invalidateActiveConnections,
  invalidateConnectionInfo,
  invalidatePendingConnections,
  invalidateSentConnections,
  saveContact,
  updateCacheSentConnections,
  useOdinClientContext,
} from '@homebase-id/common-app';

export const useConnectionActions = () => {
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();

  const disconnect = async ({ connectionOdinId }: { connectionOdinId: string }) => {
    return await disconnectFromContact(odinClient, connectionOdinId);
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
    await sendRequest(odinClient, targetOdinId, message, circleIds);

    // Save contact
    const connectionInfo = await fetchConnectionInfo(odinClient, targetOdinId);
    if (connectionInfo)
      await saveContact(odinClient, {
        fileMetadata: { appData: { content: connectionInfo } },
        serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner } },
      });

    return { targetOdinId };
  };

  const revokeConnectionRequest = async ({ targetOdinId }: { targetOdinId: string }) => {
    return await deleteSentRequest(odinClient, targetOdinId);
  };

  const block = async (odinId: string) => {
    return await blockOdinId(odinClient, odinId);
  };
  const unblock = async (odinId: string) => {
    return await unblockOdinId(odinClient, odinId);
  };

  return {
    disconnect: useMutation({
      mutationFn: disconnect,
      onSuccess: (data, param) => {
        invalidateActiveConnections(queryClient);
        invalidateConnectionInfo(queryClient, param.connectionOdinId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    sendConnectionRequest: useMutation({
      mutationFn: sendConnectionRequest,
      onMutate: async ({ targetOdinId, message }) => {
        const newRequest: ConnectionRequest = {
          status: 'sent',
          recipient: targetOdinId,
          id: getNewId(),
          message: message,
          senderOdinId: odinClient.getHostIdentity(),
          receivedTimestampMilliseconds: Date.now(),
          connectionRequestOrigin: 'identityowner',
        };

        const previousRequests = updateCacheSentConnections(queryClient, (data) => {
          return {
            ...data,
            pages: data.pages.map((page, index) =>
              index === 0
                ? {
                  ...page,
                  results: [newRequest, ...page.results],
                }
                : page
            ),
          };
        });
        return { previousRequests, newRequest };
      },
      onError: (err, newData, context) => {
        console.error(err);
        updateCacheSentConnections(queryClient, () => context?.previousRequests);
      },
      onSettled: (data) => {
        invalidateSentConnections(queryClient);
        data?.targetOdinId && invalidateConnectionInfo(queryClient, data.targetOdinId);
      },
    }),
    revokeConnectionRequest: useMutation({
      mutationFn: revokeConnectionRequest,
      onSuccess: (data, param) => {
        invalidateSentConnections(queryClient);
        invalidateConnectionInfo(queryClient, param.targetOdinId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    block: useMutation({
      mutationFn: block,
      onSettled: (_data, _err, odinId) => {
        invalidatePendingConnections(queryClient);
        invalidateActiveConnections(queryClient);
        invalidateConnectionInfo(queryClient, odinId);
      },
    }),
    unblock: useMutation({
      mutationFn: unblock,
      onSettled: (_data, _err, odinId) => {
        invalidatePendingConnections(queryClient);
        invalidateActiveConnections(queryClient);
        invalidateConnectionInfo(queryClient, odinId);
      },
    }),
  };
};
