import { useQuery } from '@tanstack/react-query';
import { getAttributeVersions } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useAttributeVersions = ({ profileId, type }: { profileId: string; type: string }) => {
  const dotYouClient = useAuth().getDotYouClient();

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
