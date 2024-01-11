import { useQuery } from '@tanstack/react-query';
import { APP_SHARED_SECRET } from '@youfoundation/common-app';
import { hasValidToken as hasValidYouAuthToken } from '@youfoundation/js-lib/auth';
import { DotYouClient } from '@youfoundation/js-lib/core';

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
