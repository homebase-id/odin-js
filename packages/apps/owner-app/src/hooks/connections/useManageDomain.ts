import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  disconnectFromDomain,
  restoreDomainAccess,
  revokeDomainAccess,
} from '../../provider/network/domainNetwork/DomainManager';
import {
  invalidateDomainInfo,
  invalidateDomains,
  useDotYouClientContext,
} from '@homebase-id/common-app';

export const useManageDomain = () => {
  const queryClient = useQueryClient();

  const dotYouClient = useDotYouClientContext();

  const revokeDomain = async ({ domain }: { domain: string }) =>
    await revokeDomainAccess(dotYouClient, domain);

  const restoreDomain = async ({ domain }: { domain: string }) =>
    await restoreDomainAccess(dotYouClient, domain);

  const removeDomain = async ({ domain }: { domain: string }) =>
    await disconnectFromDomain(dotYouClient, domain);

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
