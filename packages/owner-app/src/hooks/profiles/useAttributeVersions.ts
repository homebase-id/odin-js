import { useQuery } from '@tanstack/react-query';
import { getProfileAttributes } from '@youfoundation/js-lib/profile';
import { useAuth } from '../auth/useAuth';

export const useAttributeVersions = ({ profileId, type }: { profileId: string; type: string }) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchVersions = async ({ profileId, type }: { profileId: string; type: string }) => {
    return await getProfileAttributes(dotYouClient, profileId, undefined, [type]);
  };
  return {
    fetchVersions: useQuery({
      queryKey: ['attributeVersions', profileId, type],
      queryFn: () => fetchVersions({ profileId, type }),
      refetchOnWindowFocus: false,
    }),
  };
};
