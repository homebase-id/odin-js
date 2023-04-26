import { useQuery } from '@tanstack/react-query';
import { hasValidToken as hasValidOwnerToken } from '../../provider/OwnerAuthenticationProvider';

import { hasValidToken as hasValidYouAuthToken } from '../../provider/AuthenticationProvider';

const SHARED_SECRET = 'HSS';
const MINUTE_IN_MS = 60000;

const hasSharedSecret = () => {
  const raw = window.localStorage.getItem(SHARED_SECRET);
  return !!raw;
};

const useVerifyToken = (isOwner?: boolean) => {
  const fetchData = async () => {
    if (!hasSharedSecret()) {
      return false;
    }
    if (isOwner) {
      // const client = createOwnerAuthenticationProvider();
      return await hasValidOwnerToken();
    } else {
      // const client = createAuthenticationProvider();
      return await hasValidYouAuthToken();
    }
  };
  return useQuery(['verifyToken'], fetchData, {
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};

export default useVerifyToken;
