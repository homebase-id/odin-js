import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient } from '@youfoundation/js-lib';
import { GetAppRegistrations } from '../../provider/app/AppManagementProvider';
import useAuth from '../auth/useAuth';

const useApps = () => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchRegistered = async () => {
    const apps = await GetAppRegistrations(dotYouClient);
    return apps?.sort((a, b) => (a.isRevoked ? 1 : 0) - (b.isRevoked ? 1 : 0));
  };

  return {
    fetchRegistered: useQuery(['registeredApps'], () => fetchRegistered(), {
      refetchOnWindowFocus: false,
    }),
  };
};

export default useApps;
