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
  addDomainToCircle,
  removeDomainFromCircle,
} from '@homebase-id/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

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

  const provideDomainGrant = async ({ circleId, domain }: { circleId: string; domain: string }) => {
    return await addDomainToCircle(dotYouClient, { circleId: circleId, domain: domain });
  };

  const revokeDomainGrant = async ({ circleId, domain }: { circleId: string; domain: string }) => {
    return await removeDomainFromCircle(dotYouClient, { circleId: circleId, domain: domain });
  };

  const removeCircleInternal = async ({ circleId }: { circleId: string }) => {
    return await removeCircle(dotYouClient, circleId);
  };

  return {
    fetch: useQuery({
      queryKey: ['circle', circleId],
      queryFn: () => fetch({ circleId: circleId as string }),
      refetchOnWindowFocus: false,
      enabled: !!circleId,
    }),

    fetchMembers: useQuery({
      queryKey: ['circleMembers', circleId],
      queryFn: () => fetchMembers({ circleId: circleId as string }),

      refetchOnWindowFocus: false,
      enabled: !!circleId,
    }),

    createOrUpdate: useMutation({
      mutationFn: createOrUpdate,
      onMutate: async (newCircle) => {
        await queryClient.cancelQueries({ queryKey: ['circle', newCircle.id] });

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
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        if (newCircle?.id) {
          queryClient.invalidateQueries({ queryKey: ['circle', newCircle.id] });
        }
      },
    }),

    disableCircle: useMutation({
      mutationFn: disableCircleInternal,
      onSuccess: (data, params) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        if (params?.circleId) {
          queryClient.invalidateQueries({ queryKey: ['circle', params.circleId] });
        }
      },
    }),
    enableCircle: useMutation({
      mutationFn: enableCircleInternal,
      onSuccess: (data, params) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        if (params?.circleId) {
          queryClient.invalidateQueries({ queryKey: ['circle', params.circleId] });
        }
      },
    }),

    provideGrants: useMutation({
      mutationFn: provideGrants,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        await Promise.all(
          param.odinIds.map(async (odinId) => {
            await queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
            await queryClient.invalidateQueries({ queryKey: ['connection-grant-status', odinId] });
          })
        );
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeDomainGrants: useMutation({
      mutationFn: revokeDomainGrants,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        await Promise.all(
          param.domains.map(async (domain) => {
            await queryClient.invalidateQueries({ queryKey: ['domain-info', domain] });
          })
        );
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeIdentityGrants: useMutation({
      mutationFn: revokeIdentityGrants,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        await Promise.all(
          param.odinIds.map(async (odinId) => {
            await queryClient.invalidateQueries({ queryKey: ['connection-info', odinId] });
          })
        );
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    provideGrant: useMutation({
      mutationFn: provideGrant,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.odinId] });
        queryClient.invalidateQueries({ queryKey: ['connection-grant-status', param.odinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeGrant: useMutation({
      mutationFn: revokeGrant,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        queryClient.invalidateQueries({ queryKey: ['connection-info', param.odinId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    provideDomainGrant: useMutation({
      mutationFn: provideDomainGrant,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        queryClient.invalidateQueries({ queryKey: ['domain-info', param.domain] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeDomainGrant: useMutation({
      mutationFn: revokeDomainGrant,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', circleId] });
        queryClient.invalidateQueries({ queryKey: ['circleMembers', circleId] });
        queryClient.invalidateQueries({ queryKey: ['domain-info', param.domain] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    removeCircle: useMutation({
      mutationFn: removeCircleInternal,
      onSuccess: async (data, param) => {
        queryClient.invalidateQueries({ queryKey: ['circles'] });
        queryClient.invalidateQueries({ queryKey: ['circle', param.circleId] });
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
