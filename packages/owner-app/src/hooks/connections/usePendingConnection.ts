import { InfiniteData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import {
  ConnectionRequest,
  DotYouProfile,
  acceptConnectionRequest,
  deletePendingRequest,
  getPendingRequest,
} from '@homebase-id/js-lib/network';
import { saveContact } from '../../provider/contact/ContactProvider';
import { fetchConnectionInfo } from '../../provider/contact/ContactSourceProvider';
import { NumberCursoredResult, SecurityGroupType } from '@homebase-id/js-lib/core';
import { getNewId } from '@homebase-id/js-lib/helpers';

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
        await queryClient.cancelQueries({ queryKey: ['active-connections'] });

        const previousConnections = queryClient.getQueryData<
          InfiniteData<NumberCursoredResult<DotYouProfile>>
        >(['active-connections']);

        const newConnections = {
          pageParams: [],
          ...previousConnections,
          pages:
            previousConnections?.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    data: [
                      ...page.results,
                      {
                        odinId: newRequest.senderOdinId,
                      },
                    ],
                  }
                : page
            ) || [],
        };

        queryClient.setQueryData<InfiniteData<NumberCursoredResult<DotYouProfile>>>(
          ['active-connections'],
          newConnections
        );

        // Update pending connections
        await queryClient.cancelQueries({ queryKey: ['pending-connections'] });

        const previousPending: ConnectionRequest[] | undefined = queryClient.getQueryData([
          'pending-connections',
        ]);
        queryClient.setQueryData(
          ['pending-connections'],
          previousPending?.filter((r) => r.recipient !== newRequest.senderOdinId)
        );

        return { previousConnections, previousPending, newRequest };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['active-connections'], context?.previousConnections);
        queryClient.setQueryData(['pending-connections'], context?.previousPending);
      },
      onSettled: (data) => {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
        queryClient.invalidateQueries({ queryKey: ['pending-connection', data?.senderOdinId] });
        queryClient.invalidateQueries({ queryKey: ['active-connections'] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', data?.senderOdinId] });
      },
    }),
    ignoreRequest: useMutation({
      mutationFn: ignoreRequest,
      onSuccess: (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['pending-connections'] });
        queryClient.invalidateQueries({ queryKey: ['pending-connection', param.senderOdinId] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.senderOdinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
