import { useQuery } from '@tanstack/react-query';
import { DriveDefinition, getDrives } from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';

export const useDrives = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchAll = async (): Promise<DriveDefinition[]> => {
    return await (
      await getDrives(dotYouClient, { pageNumber: 1, pageSize: 100 })
    ).results;
  };

  return {
    fetch: useQuery({
      queryKey: ['drives'],
      queryFn: () => fetchAll(),
      refetchOnWindowFocus: false,
    }),
  };
};
