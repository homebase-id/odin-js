import { QueryClient, useQuery } from '@tanstack/react-query';
import { hasValidOwnerToken, hasValidPublicToken } from '@homebase-id/common-app';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = (isOwner?: boolean) => {
  const fetchData = async () => {
    if (isOwner) return await hasValidOwnerToken();
    else return await hasValidPublicToken();
  };

  return useQuery({
    queryKey: ['verify-public-token'],
    queryFn: fetchData,
    staleTime: MINUTE_IN_MS * 10,
  });
};

export const invalidateVerifyToken = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['verify-public-token'] });
};
