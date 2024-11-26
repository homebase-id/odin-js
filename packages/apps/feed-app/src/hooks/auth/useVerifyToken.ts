import { QueryClient, useQuery } from '@tanstack/react-query';
import { APP_SHARED_SECRET } from '@homebase-id/common-app';
import { hasValidToken as hasValidYouAuthToken } from '@homebase-id/js-lib/auth';
import { DotYouClient } from '@homebase-id/js-lib/core';

const MINUTE_IN_MS = 60000;

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

export const useVerifyToken = (dotYouClient: DotYouClient) => {
  const fetchData = async () => {
    if (!hasSharedSecret()) {
      return false;
    }

    return await hasValidYouAuthToken(dotYouClient);
  };
  return useQuery({
    queryKey: ['verifyToken'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
    gcTime: MINUTE_IN_MS * 10,
  });
};

export const invalidateVerifyToken = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['verifyToken'] });
};
