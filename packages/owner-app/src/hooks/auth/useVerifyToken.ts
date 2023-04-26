import { useQuery } from '@tanstack/react-query';
import { hasValidToken } from '../../provider/AuthenticationProvider';

const MINUTE_IN_MS = 60000;

const useVerifyToken = () => {
  const fetchData = async () => {
    return await hasValidToken();
  };
  return useQuery(['verifyToken'], fetchData, {
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};

export default useVerifyToken;
