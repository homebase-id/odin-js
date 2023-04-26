import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, getAttributeVersions } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useAttributeVersions = ({ profileId, type }: { profileId: string; type: string }) => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchVersions = async ({ profileId, type }: { profileId: string; type: string }) => {
    return await getAttributeVersions(dotYouClient, profileId, undefined, [type]);
  };
  return {
    fetchVersions: useQuery(
      ['attributeVersions', profileId, type],
      () => fetchVersions({ profileId, type }),
      {
        refetchOnWindowFocus: false,
      }
    ),
  };
};

export default useAttributeVersions;
