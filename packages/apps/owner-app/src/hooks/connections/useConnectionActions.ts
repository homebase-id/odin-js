import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  disconnectFromContact,
  sendConnectionRequestWithOutcome,
  deleteSentRequest,
  blockOdinId,
  unblockOdinId,
  AutoConnectOutcome,
  ConnectionRequestResult,
} from '@homebase-id/js-lib/network';
import { SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  fetchConnectionInfo,
  invalidateActiveConnections,
  invalidateConnectionInfo,
  invalidatePendingConnections,
  invalidateSentConnections,
  saveContact,
  useDotYouClientContext,
} from '@homebase-id/common-app';

export const useConnectionActions = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

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
  }): Promise<{ targetOdinId: string; result: ConnectionRequestResult }> => {
    const result = await sendConnectionRequestWithOutcome(
      dotYouClient,
      targetOdinId,
      message,
      circleIds
    );

    if (
      result.outcome === AutoConnectOutcome.Connected ||
      result.outcome === AutoConnectOutcome.AcceptedFromExistingIncoming ||
      result.outcome === AutoConnectOutcome.AlreadyConnected
    ) {
      const connectionInfo = await fetchConnectionInfo(dotYouClient, targetOdinId);
      if (connectionInfo)
        await saveContact(dotYouClient, {
          fileMetadata: { appData: { content: connectionInfo } },
          serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner } },
        });
    }

    return { targetOdinId, result };
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
        invalidateActiveConnections(queryClient);
        invalidateConnectionInfo(queryClient, param.connectionOdinId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    sendConnectionRequest: useMutation({
      mutationFn: sendConnectionRequest,
      onSuccess: ({ targetOdinId, result }) => {
        switch (result.outcome) {
          case AutoConnectOutcome.Connected:
          case AutoConnectOutcome.AcceptedFromExistingIncoming:
          case AutoConnectOutcome.AlreadyConnected:
            invalidateActiveConnections(queryClient);
            invalidateConnectionInfo(queryClient, targetOdinId);
            return;
          case AutoConnectOutcome.PendingManualApproval:
          case AutoConnectOutcome.OutgoingRequestAlreadyExists:
            invalidateSentConnections(queryClient);
            invalidateConnectionInfo(queryClient, targetOdinId);
            return;
        }
      },
      onError: (err) => {
        console.error(err);
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
