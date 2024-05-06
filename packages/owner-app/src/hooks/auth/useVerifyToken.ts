import { useQuery } from '@tanstack/react-query';
import { hasValidOwnerToken } from '@youfoundation/common-app';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = () => {
  const fetchData = async () => {
    return await hasValidOwnerToken();
  };
  return useQuery({
    queryKey: ['verifyToken'],
    queryFn: fetchData,
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10,
  });
};
