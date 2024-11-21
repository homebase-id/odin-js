import { useQuery } from '@tanstack/react-query';
import { DriveDefinition, getDrives } from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useDrives = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchAll = async (): Promise<DriveDefinition[]> => {
    return (await getDrives(dotYouClient, { pageNumber: 1, pageSize: 100 })).results;
  };

  return {
    fetch: useQuery({
      queryKey: ['drives'],
      queryFn: () => fetchAll(),
      refetchOnWindowFocus: false,
    }),
  };
};
