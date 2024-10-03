import { useQuery } from '@tanstack/react-query';
import {
  HOME_SHARED_SECRET,
  OWNER_SHARED_SECRET,
  hasValidOwnerToken,
} from '@homebase-id/common-app';

import { hasValidToken as hasValidYouAuthToken } from '../../provider/AuthenticationProvider';

const MINUTE_IN_MS = 60000;

const hasSharedSecret = (isOwner?: boolean) => {
  if (isOwner) {
    return !!window.localStorage.getItem(OWNER_SHARED_SECRET);
  } else {
    return !!window.localStorage.getItem(HOME_SHARED_SECRET);
  }
};

export const useVerifyToken = (isOwner?: boolean) => {
  const fetchData = async () => {
    if (!hasSharedSecret(isOwner)) return false;

    if (isOwner) return await hasValidOwnerToken();
    else return await hasValidYouAuthToken();
  };
  return useQuery({
    queryKey: ['verifyToken'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};
