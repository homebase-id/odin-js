import { QueryClient, useQuery } from '@tanstack/react-query';
import { GetAppRegistrations } from '../../provider/app/AppManagementProvider';
import { useAuth } from '../auth/useAuth';

export const useApps = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchRegistered = async () => {
    const apps = await GetAppRegistrations(dotYouClient);
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
