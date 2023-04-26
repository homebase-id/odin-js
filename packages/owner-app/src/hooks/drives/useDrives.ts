import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, DriveDefinition, getDrives } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useDrives = () => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchAll = async (): Promise<DriveDefinition[]> => {
    return await (
      await getDrives(dotYouClient, { pageNumber: 1, pageSize: 100 })
    ).results;
  };

  return {
    fetch: useQuery(['drives'], () => fetchAll(), {
      refetchOnWindowFocus: false,
    }),
  };
};

export default useDrives;
