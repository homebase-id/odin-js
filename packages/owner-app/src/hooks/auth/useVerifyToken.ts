import { useQuery } from '@tanstack/react-query';
import { hasValidToken } from '../../provider/auth/AuthenticationProvider';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = () => {
  const fetchData = async () => {
    return await hasValidToken();
  };
  return useQuery(['verifyToken'], fetchData, {
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};
