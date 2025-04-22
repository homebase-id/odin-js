import { useQuery } from '@tanstack/react-query';
import { DriveDefinition, getDrives } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '@homebase-id/common-app';

export const useDrives = () => {
  const odinClient = useOdinClientContext();

  const fetchAll = async (): Promise<DriveDefinition[]> => {
    return (await getDrives(odinClient, { pageNumber: 1, pageSize: 100 })).results;
  };

  return {
    fetch: useQuery({
      queryKey: ['drives'],
      queryFn: () => fetchAll(),
      refetchOnWindowFocus: false,
    }),
  };
};
