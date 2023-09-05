import { useQuery } from '@tanstack/react-query';
import { hasValidToken as hasValidYouAuthToken } from '@youfoundation/js-lib/auth';
import { DotYouClient } from '@youfoundation/js-lib/core';
import { APP_SHARED_SECRET } from './useAuth';

const MINUTE_IN_MS = 60000;

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  return !!raw;
};

const useVerifyToken = (dotYouClient: DotYouClient) => {
  const fetchData = async () => {
    if (!hasSharedSecret()) {
      return false;
    }

    return await hasValidYouAuthToken(dotYouClient);
  };
  return useQuery(['verifyToken'], fetchData, {
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};

export default useVerifyToken;
