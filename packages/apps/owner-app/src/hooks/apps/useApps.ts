import { QueryClient, useQuery } from '@tanstack/react-query';
import { GetAppRegistrations } from '../../provider/app/AppManagementProvider';
import { useOdinClientContext } from '@homebase-id/common-app';

export const useApps = () => {
  const odinClient = useOdinClientContext();

  const fetchRegistered = async () => {
    const apps = await GetAppRegistrations(odinClient);
    return apps?.sort((a, b) => (a.isRevoked ? 1 : 0) - (b.isRevoked ? 1 : 0));
  };

  return {
    fetchRegistered: useQuery({
      queryKey: ['apps'],
      queryFn: () => fetchRegistered(),
      refetchOnWindowFocus: false,
    }),
  };
};

export const invalidateApps = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['apps'] });
};
