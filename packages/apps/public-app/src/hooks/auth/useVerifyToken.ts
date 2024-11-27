import { QueryClient, useQuery } from '@tanstack/react-query';
import {
  hasValidOwnerToken,
  hasValidPublicToken,
  useDotYouClientContext,
} from '@homebase-id/common-app';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = (isOwner?: boolean) => {
  const isAuthenticated = useDotYouClientContext().isAuthenticated;

  const fetchData = async () => {
    if (isOwner) return await hasValidOwnerToken();
    else return await hasValidPublicToken();
  };

  return useQuery({
    queryKey: ['verifyToken'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
    enabled: isAuthenticated,
  });
};

export const invalidateVerifyToken = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['verifyToken'] });
};
