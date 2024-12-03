import { useQuery } from '@tanstack/react-query';
import { getRecoveryKey } from '../../provider/auth/RecoveryProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useRecoveryKey = () => {
  const dotYouClient = useDotYouClientContext();
  const fetchKey = async () => await getRecoveryKey(dotYouClient);

  return {
    fetchKey: useQuery({
      queryKey: ['recovery-key'],
      queryFn: fetchKey,
      gcTime: Infinity, // Recovery key can only be fetch once at the moment.. If it fails, you're screwed
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }),
  };
};
