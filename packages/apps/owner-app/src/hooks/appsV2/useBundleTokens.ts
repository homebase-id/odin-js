import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  allowBundleToken,
  deleteBundleToken,
  getBundleTokens,
  issueBundleToken,
  IssueBundleTokenRequest,
  removeAppFromBundleToken,
  revokeBundleToken,
} from '@homebase-id/js-lib/auth';

/** Bundle tokens, optionally only those reaching `appId`. Modelled on useAppClients. */
export const useBundleTokens = ({ appId }: { appId?: string } = {}) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();
  const onSuccess = () => invalidateBundleTokens(queryClient);

  return {
    fetch: useQuery({
      queryKey: ['bundle-tokens', appId ?? 'all'],
      queryFn: () => getBundleTokens(dotYouClient, appId),
      refetchOnWindowFocus: false,
      retry: false,
    }),
    issue: useMutation({
      mutationFn: (request: IssueBundleTokenRequest) => issueBundleToken(dotYouClient, request),
      onSuccess,
    }),
    revoke: useMutation({
      mutationFn: ({ tokenId }: { tokenId: string }) => revokeBundleToken(dotYouClient, tokenId),
      onSuccess,
    }),
    allow: useMutation({
      mutationFn: ({ tokenId }: { tokenId: string }) => allowBundleToken(dotYouClient, tokenId),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: ({ tokenId }: { tokenId: string }) => deleteBundleToken(dotYouClient, tokenId),
      onSuccess,
    }),
    removeApp: useMutation({
      mutationFn: ({ tokenId, appId }: { tokenId: string; appId: string }) =>
        removeAppFromBundleToken(dotYouClient, tokenId, appId),
      onSuccess,
    }),
  };
};

export const invalidateBundleTokens = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: ['bundle-tokens'] });
