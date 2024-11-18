import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  DotYouProfile,
  acceptConnectionRequest,
  deletePendingRequest,
  getPendingRequest,
} from '@homebase-id/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';
import { SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  invalidateActiveConnections,
  invalidateConnectionInfo,
  invalidatePendingConnections,
  updateCacheActiveConnections,
  updateCachePendingConnections,
} from '@homebase-id/common-app';

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
      queryKey: ['pending-connection', odinId],
      queryFn: () => getPendingConnectionInfo({ odinId: odinId as string }),

      refetchOnWindowFocus: false,
      enabled: !!odinId,
    }),
    acceptRequest: useMutation({
      mutationFn: acceptRequest,
      onMutate: async (newRequest) => {
        // Update active connections
        const newConnection: DotYouProfile = {
          odinId: newRequest.senderOdinId,
        };
        updateCacheActiveConnections(queryClient, (data) => ({
          ...data,
          pages: data.pages.map((page, index) =>
            index === 0
              ? {
                  ...page,
                  results: [
                    newConnection,
                    ...page.results.filter((r) => r.odinId !== newRequest.senderOdinId),
                  ],
                }
              : {
                  ...page,
                  results: page.results.filter((r) => r.odinId !== newRequest.senderOdinId),
                }
          ),
        }));

        const previousPending = updateCachePendingConnections(queryClient, (data) => ({
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            results: page.results.filter((r) => r.senderOdinId !== newRequest.senderOdinId),
          })),
        }));

        return { previousPending, newRequest };
      },
      onError: (err, newData, context) => {
        console.error(err);

        invalidateActiveConnections(queryClient);
        updateCachePendingConnections(queryClient, () => context?.previousPending);
      },
      onSettled: (data) => {
        invalidateActiveConnections(queryClient);
        invalidatePendingConnections(queryClient);
        data?.senderOdinId && invalidatePendingConnection(queryClient, data?.senderOdinId);
        data?.senderOdinId && invalidateConnectionInfo(queryClient, data?.senderOdinId);
      },
    }),
    ignoreRequest: useMutation({
      mutationFn: ignoreRequest,
      onSuccess: (data, param) => {
        invalidatePendingConnections(queryClient);
        param?.senderOdinId && invalidatePendingConnection(queryClient, param?.senderOdinId);
        param?.senderOdinId && invalidateConnectionInfo(queryClient, param?.senderOdinId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export const invalidatePendingConnection = (queryClient: QueryClient, odinId: string) => {
  queryClient.invalidateQueries({ queryKey: ['pending-connection', odinId] });
};
