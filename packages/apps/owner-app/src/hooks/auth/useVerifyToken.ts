import { QueryClient, useQuery } from '@tanstack/react-query';
import { hasValidOwnerToken, useOdinClientContext } from '@homebase-id/common-app';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = () => {
  const isAuthenticated = useOdinClientContext().isAuthenticated();
  const fetchData = async () => await hasValidOwnerToken();

  return useQuery({
    queryKey: ['verify-owner-token'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
    enabled: isAuthenticated,
  });
};

export const invalidateVerifyToken = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['verify-owner-token'] });
};
