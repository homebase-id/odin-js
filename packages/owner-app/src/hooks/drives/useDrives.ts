import { useQuery } from '@tanstack/react-query';
import { DriveDefinition, getDrives } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useDrives = () => {
  const dotYouClient = useAuth().getDotYouClient();

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
