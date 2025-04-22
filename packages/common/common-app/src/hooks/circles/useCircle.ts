import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { invalidateCircles } from './useCircles';
import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { invalidateDomainInfo } from '../connections/useDomain';
import { invalidateConnectionInfo } from '../connections/useConnectionInfo';
import { invalidateConnectionGrantStatus } from '../connections/useConnectionGrantStatus';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useCircle = (props?: { circleId?: string }) => {
  const { circleId } = props || {};
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const fetch = async ({ circleId }: { circleId: string }) => {
    if (!circleId) {
      return;
    }
    return await getCircle(odinClient, circleId);
  };

  const fetchMembers = async ({ circleId }: { circleId: string }) => {
    if (!circleId) {
      return;
    }
    return await fetchMembersOfCircle(odinClient, circleId);
  };

  const createOrUpdate = async (circleDefinition: CircleDefinition) => {
    if (circleDefinition.id) {
      return await updateCircleDefinition(odinClient, circleDefinition);
    } else {
      return await createCircleDefinition(odinClient, circleDefinition);
    }
  };

  const disableCircleInternal = async ({ circleId }: { circleId: string }) => {
    return await disableCircle(odinClient, circleId);
  };

  const enableCircleInternal = async ({ circleId }: { circleId: string }) => {
    return await enableCircle(odinClient, circleId);
  };

  const provideGrants = async ({ circleId, odinIds }: { circleId: string; odinIds: string[] }) => {
    return await Promise.all(
      odinIds.map(
        async (odinId) =>
          await addMemberToCircle(odinClient, { circleId: circleId, odinId: odinId })
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
        async (domain) => await removeDomainFromCircle(odinClient, { circleId: circleId, domain })
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
          await removeMemberFromCircle(odinClient, { circleId: circleId, odinId: odinId })
      )
    );
  };

  const provideGrant = async ({ circleId, odinId }: { circleId: string; odinId: string }) =>
    await addMemberToCircle(odinClient, { circleId: circleId, odinId: odinId });

  const revokeGrant = async ({ circleId, odinId }: { circleId: string; odinId: string }) =>
    await removeMemberFromCircle(odinClient, { circleId: circleId, odinId: odinId });

  const provideDomainGrant = async ({ circleId, domain }: { circleId: string; domain: string }) =>
    await addDomainToCircle(odinClient, { circleId: circleId, domain: domain });

  const revokeDomainGrant = async ({ circleId, domain }: { circleId: string; domain: string }) =>
    await removeDomainFromCircle(odinClient, { circleId: circleId, domain: domain });

  const removeCircleInternal = async ({ circleId }: { circleId: string }) =>
    await removeCircle(odinClient, circleId);

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
        invalidateCircles(queryClient);
        if (newCircle?.id) {
          invalidateCircle(queryClient, newCircle.id);
        }
      },
    }),

    disableCircle: useMutation({
      mutationFn: disableCircleInternal,
      onSuccess: (data, params) => {
        invalidateCircles(queryClient);
        if (params?.circleId) {
          invalidateCircle(queryClient, params.circleId);
        }
      },
    }),
    enableCircle: useMutation({
      mutationFn: enableCircleInternal,
      onSuccess: (data, params) => {
        invalidateCircles(queryClient);
        if (params?.circleId) {
          invalidateCircle(queryClient, params.circleId);
        }
      },
    }),

    provideGrants: useMutation({
      mutationFn: provideGrants,
      onSuccess: async (data, param) => {
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        await Promise.all(
          param.odinIds.map(async (odinId) => {
            invalidateConnectionInfo(queryClient, odinId);
            await invalidateConnectionGrantStatus(queryClient, odinId);
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
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        await Promise.all(
          param.domains.map(async (domain) => {
            domain && invalidateDomainInfo(queryClient, domain);
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
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        await Promise.all(
          param.odinIds.map(async (odinId) => {
            await invalidateConnectionInfo(queryClient, odinId);
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
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        invalidateConnectionInfo(queryClient, param.odinId);
        invalidateConnectionGrantStatus(queryClient, param.odinId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeGrant: useMutation({
      mutationFn: revokeGrant,
      onSuccess: async (data, param) => {
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        invalidateConnectionInfo(queryClient, param.odinId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    provideDomainGrant: useMutation({
      mutationFn: provideDomainGrant,
      onSuccess: async (data, param) => {
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        param.domain && invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    revokeDomainGrant: useMutation({
      mutationFn: revokeDomainGrant,
      onSuccess: async (data, param) => {
        invalidateCircles(queryClient);
        circleId && invalidateCircle(queryClient, circleId);
        circleId && invalidateCircleMembers(queryClient, circleId);
        param.domain && invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    removeCircle: useMutation({
      mutationFn: removeCircleInternal,
      onSuccess: async (data, param) => {
        invalidateCircles(queryClient);
        invalidateCircle(queryClient, param.circleId);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export const invalidateCircle = (queryClient: QueryClient, circleId: string) => {
  queryClient.invalidateQueries({ queryKey: ['circle', formatGuidId(circleId)] });
};

export const invalidateCircleMembers = (queryClient: QueryClient, circleId: string) => {
  queryClient.invalidateQueries({ queryKey: ['circleMembers', formatGuidId(circleId)] });
};
