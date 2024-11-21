import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { getRecoveryKey } from '../../provider/auth/RecoveryProvider';

export const useRecoveryKey = () => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchKey = async () => {
    return await getRecoveryKey(dotYouClient);
  };

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
