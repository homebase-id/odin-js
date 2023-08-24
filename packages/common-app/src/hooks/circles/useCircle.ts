import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleDefinition,
  disableCircle,
  enableCircle,
  getCircle,
  removeCircle,
  fetchMembersOfCircle,
  updateCircleDefinition,
  createCircleDefinition,
  addMemberToCircle,
  removeMemberFromCircle,
  removeDomainFromCircle,
} from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../../..';

export const useCircle = ({ circleId }: { circleId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async ({ circleId }: { circleId: string }) => {
    if (!circleId) {
      return;
    }
    return await getCircle(dotYouClient, circleId);
  };

  const fetchMembers = async ({ circleId }: { circleId: string }) => {
    if (!circleId) {
      return;
    }
    return await fetchMembersOfCircle(dotYouClient, circleId);
  };

  const createOrUpdate = async (circleDefinition: CircleDefinition) => {
    if (circleDefinition.lastUpdated) {
      return await updateCircleDefinition(dotYouClient, circleDefinition);
    } else {
      return await createCircleDefinition(dotYouClient, circleDefinition);
    }
  };

  const disableCircleInternal = async ({ circleId }: { circleId: string }) => {
    return await disableCircle(dotYouClient, circleId);
  };

  const enableCircleInternal = async ({ circleId }: { circleId: string }) => {
    return await enableCircle(dotYouClient, circleId);
  };

  const provideGrants = async ({ circleId, odinIds }: { circleId: string; odinIds: string[] }) => {
    return await Promise.all(
      odinIds.map(
        async (odinId) =>
          await addMemberToCircle(dotYouClient, { circleId: circleId, odinId: odinId })
      )
    );
  };

  const revokeDomainGrants = async ({
    circleId,
    domains,
  }: {
    circleId: string;
    domains: string[];
  }) => {
    return await Promise.all(
      domains.map(
        async (domain) => await removeDomainFromCircle(dotYouClient, { circleId: circleId, domain })
      )
    );
  };

  const revokeIdentityGrants = async ({
    circleId,
    odinIds,
  }: {
    circleId: string;
    odinIds: string[];
  }) => {
    return await Promise.all(
      odinIds.map(
        async (odinId) =>
          await removeMemberFromCircle(dotYouClient, { circleId: circleId, odinId: odinId })
      )
    );
  };

  const provideGrant = async ({ circleId, odinId }: { circleId: string; odinId: string }) => {
    return await addMemberToCircle(dotYouClient, { circleId: circleId, odinId: odinId });
  };

  const revokeGrant = async ({ circleId, odinId }: { circleId: string; odinId: string }) => {
    return await removeMemberFromCircle(dotYouClient, { circleId: circleId, odinId: odinId });
  };

  const removeCircleInternal = async ({ circleId }: { circleId: string }) => {
    return await removeCircle(dotYouClient, circleId);
  };

  return {
    fetch: useQuery(['circle', circleId], () => fetch({ circleId: circleId as string }), {
      refetchOnWindowFocus: false,
      enabled: !!circleId,
    }),

    fetchMembers: useQuery(
      ['cirleMembers', circleId],
      () => fetchMembers({ circleId: circleId as string }),
      {
        refetchOnWindowFocus: false,
        enabled: !!circleId,
      }
    ),

    createOrUpdate: useMutation(createOrUpdate, {
      onMutate: async (newCircle) => {
        await queryClient.cancelQueries(['circle', newCircle.id]);

        // Update single attribute
        const previousCircle = queryClient.getQueryData(['circle', newCircle.id]);
        queryClient.setQueryData(['circle', newCircle.id], newCircle);

        // Update section attributes
        const previousCircles: CircleDefinition[] | undefined = queryClient.getQueryData([
          'circles',
        ]);
        const newCircles = previousCircles?.map((circle) =>
          circle.id === newCircle.id ? newCircle : circle
        );
        queryClient.setQueryData(['circles'], newCircles);

        return { previousCircle, newCircle, previousCircles };
      },
      onError: (err, newCircle, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['circle', newCircle.id], context?.previousCircle);
        queryClient.setQueryData(['circles'], context?.previousCircles);
      },
      onSettled: (newCircle) => {
        queryClient.invalidateQueries(['circles']);
        if (newCircle?.id) {
          queryClient.invalidateQueries(['circle', newCircle.id]);
        }
      },
    }),

    disableCircle: useMutation(disableCircleInternal, {
      onSuccess: (data, params) => {
        queryClient.invalidateQueries(['circles']);
        if (params?.circleId) {
          queryClient.invalidateQueries(['circle', params.circleId]);
        }
      },
    }),
    enableCircle: useMutation(enableCircleInternal, {
      onSuccess: (data, params) => {
        queryClient.invalidateQueries(['circles']);
        if (params?.circleId) {
          queryClient.invalidateQueries(['circle', params.circleId]);
        }
      },
    }),

    provideGrants: useMutation(provideGrants, {
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries(['circles']);
        queryClient.invalidateQueries(['circle', circleId]);
        queryClient.invalidateQueries(['cirleMembers', circleId]);
        await Promise.all(
          param.odinIds.map(async (odinId) => {
            return await queryClient.invalidateQueries(['connectionInfo', odinId]);
          })
        );
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeDomainGrants: useMutation(revokeDomainGrants, {
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries(['circles']);
        queryClient.invalidateQueries(['circle', circleId]);
        queryClient.invalidateQueries(['cirleMembers', circleId]);
        await Promise.all(
          param.domains.map(async (domain) => {
            return await queryClient.invalidateQueries(['domainInfo', domain]);
          })
        );
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeIdentityGrants: useMutation(revokeIdentityGrants, {
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries(['circles']);
        queryClient.invalidateQueries(['circle', circleId]);
        queryClient.invalidateQueries(['cirleMembers', circleId]);
        await Promise.all(
          param.odinIds.map(async (odinId) => {
            return await queryClient.invalidateQueries(['connectionInfo', odinId]);
          })
        );
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    provideGrant: useMutation(provideGrant, {
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries(['circles']);
        queryClient.invalidateQueries(['circle', circleId]);
        queryClient.invalidateQueries(['cirleMembers', circleId]);
        queryClient.invalidateQueries(['connectionInfo', param.odinId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeGrant: useMutation(revokeGrant, {
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries(['circles']);
        queryClient.invalidateQueries(['circle', circleId]);
        queryClient.invalidateQueries(['cirleMembers', circleId]);
        queryClient.invalidateQueries(['connectionInfo', param.odinId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    removeCircle: useMutation(removeCircleInternal, {
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries(['circles']);
        queryClient.invalidateQueries(['circle', param.circleId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
