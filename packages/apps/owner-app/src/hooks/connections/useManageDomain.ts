import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  disconnectFromDomain,
  restoreDomainAccess,
  revokeDomainAccess,
} from '../../provider/network/domainNetwork/DomainManager';
import {
  invalidateDomainInfo,
  invalidateDomains,
  useOdinClientContext,
} from '@homebase-id/common-app';

export const useManageDomain = () => {
  const queryClient = useQueryClient();

  const odinClient = useOdinClientContext();

  const revokeDomain = async ({ domain }: { domain: string }) =>
    await revokeDomainAccess(odinClient, domain);

  const restoreDomain = async ({ domain }: { domain: string }) =>
    await restoreDomainAccess(odinClient, domain);

  const removeDomain = async ({ domain }: { domain: string }) =>
    await disconnectFromDomain(odinClient, domain);

  return {
    revokeDomain: useMutation({
      mutationFn: revokeDomain,
      onSuccess: (_data, param) => {
        invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    restoreDomain: useMutation({
      mutationFn: restoreDomain,
      onSuccess: (_data, param) => {
        invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),

    disconnect: useMutation({
      mutationFn: removeDomain,
      onSuccess: (_data, param) => {
        invalidateDomains(queryClient);
        invalidateDomainInfo(queryClient, param.domain);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
