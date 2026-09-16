import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { BundleAuthorizationRequest, previewBundleAuthorization } from '@homebase-id/js-lib/auth';

/**
 * `POST /api/v2/bundle-tokens/authorize/preview` for the current selection. Keyed on the request, so
 * changing the selection re-runs it; the previous answer stays on screen while the new one loads.
 */
export const useBundleAuthorizationPreview = (request: BundleAuthorizationRequest | undefined) => {
  const dotYouClient = useDotYouClientContext();

  return useQuery({
    queryKey: ['bundle-authorization-preview', request],
    queryFn: () => previewBundleAuthorization(dotYouClient, request as BundleAuthorizationRequest),
    enabled: !!request,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 0,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
};
