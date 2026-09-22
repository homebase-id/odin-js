import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  AppManifestV2,
  getAppRegistrationV2,
  getAppRegistrationsV2,
  validateAppManifestV2,
} from '@homebase-id/js-lib/auth';

/** Every V2 registration (`GET /api/v2/app-registrations`). */
export const useAppRegistrationsV2 = () => {
  const dotYouClient = useDotYouClientContext();

  return {
    fetch: useQuery({
      queryKey: ['app-registrations-v2'],
      queryFn: () => getAppRegistrationsV2(dotYouClient),
      refetchOnWindowFocus: false,
      retry: false,
    }),
  };
};

export const useAppRegistrationV2 = (appId: string | undefined) => {
  const dotYouClient = useDotYouClientContext();

  return {
    fetch: useQuery({
      queryKey: ['app-registrations-v2', appId],
      queryFn: async () => (await getAppRegistrationV2(dotYouClient, appId as string)) ?? null,
      refetchOnWindowFocus: false,
      retry: false,
      enabled: !!appId,
    }),
  };
};

/** The dry run behind the registration page. Never cached: it describes a pending change. */
export const useValidateAppManifestV2 = (manifest: AppManifestV2 | undefined) => {
  const dotYouClient = useDotYouClientContext();

  return {
    validate: useQuery({
      queryKey: ['app-registration-v2-validate', manifest],
      queryFn: () => validateAppManifestV2(dotYouClient, manifest as AppManifestV2),
      refetchOnWindowFocus: false,
      retry: false,
      gcTime: 0,
      staleTime: 0,
      enabled: !!manifest,
    }),
  };
};

export const invalidateAppRegistrationsV2 = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['app-registrations-v2'] });
  // The V1 pages read the same registrations.
  queryClient.invalidateQueries({ queryKey: ['apps'] });
  queryClient.invalidateQueries({ queryKey: ['drives'] });
  queryClient.invalidateQueries({ queryKey: ['circles'] });
};

export const useInvalidateAppRegistrationsV2 = () => {
  const queryClient = useQueryClient();
  return () => invalidateAppRegistrationsV2(queryClient);
};
