import { QueryClient, useQuery } from '@tanstack/react-query';
import { getProfileAttributes } from '@homebase-id/js-lib/profile';
import { useAuth } from '../auth/useAuth';

export const useAttributeVersions = ({ profileId, type }: { profileId: string; type: string }) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchVersions = async ({ profileId, type }: { profileId: string; type: string }) => {
    return await getProfileAttributes(dotYouClient, profileId, undefined, [type]);
  };
  return {
    fetchVersions: useQuery({
      queryKey: ['attribute-versions', profileId, type],
      queryFn: () => fetchVersions({ profileId, type }),
      refetchOnWindowFocus: false,
    }),
  };
};

export const invalidateAttributeVersions = (
  queryClient: QueryClient,
  profileId?: string,
  type?: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['attribute-versions', profileId, type],
    exact: !!profileId && !!type,
  });
};
