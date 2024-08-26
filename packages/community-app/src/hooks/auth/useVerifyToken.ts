import { useQuery } from '@tanstack/react-query';
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
    if (!hasSharedSecret()) return false;

    // When hasValidYouAuthToken returns undefined, it means that it couldn't be checked.. so we assume it's valid, to avoid unnecessary logouts
    return (await hasValidYouAuthToken(dotYouClient)) ?? true;
  };
  return useQuery({
    queryKey: ['verifyToken'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
    gcTime: MINUTE_IN_MS * 10,
  });
};
