import { QueryClient, useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { hasValidToken as hasValidYouAuthToken } from '@homebase-id/js-lib/auth';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = () => {
  const dotYouClient = useDotYouClientContext();
  const isAuthenticated = dotYouClient.isAuthenticated();

  const fetchData = async () => {
    // When hasValidYouAuthToken returns undefined, it means that it couldn't be checked.. so we assume it's valid, to avoid unnecessary logouts
    return (await hasValidYouAuthToken(dotYouClient)) ?? true;
  };
  return useQuery({
    queryKey: ['verify-token'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
    gcTime: MINUTE_IN_MS * 10,
    enabled: isAuthenticated,
  });
};

export const invalidateVerifyToken = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['verify-token'] });
};
