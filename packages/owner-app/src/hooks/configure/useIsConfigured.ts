import { useQuery } from '@tanstack/react-query';
import { isConfigured } from '../../provider/system/SystemProvider';
import { useAuth } from '../auth/useAuth';
import { FIRST_RUN_TOKEN_STORAGE_KEY } from './useInit';

const LOCAL_STORAGE_KEY = 'isConfigured';
const MINUTE_IN_MS = 60000;

export const useIsConfigured = () => {
  const { getSharedSecret, isAuthenticated } = useAuth();
  const dotYouClient = useAuth().getDotYouClient();
  const sharedSecret = getSharedSecret();

  const getIsConfigured = async () => {
    if (!isAuthenticated) {
      console.warn('getIsConfigured: Not authenticated');
      return;
    }

    if (!sharedSecret) {
      console.warn('getIsConfigured: No shared secret');
      return;
    }

    // Only check isConfigured once per app version
    if (
      localStorage.getItem(LOCAL_STORAGE_KEY) === import.meta.env.VITE_VERSION &&
      import.meta.env.PROD
    )
      return true;
    const result = await isConfigured(dotYouClient);
    if (result) {
      localStorage.setItem(LOCAL_STORAGE_KEY, import.meta.env.VITE_VERSION);
      localStorage.removeItem(FIRST_RUN_TOKEN_STORAGE_KEY);
    }

    return result;
  };

  return {
    isConfigured: useQuery({
      queryKey: ['initialized'],
      queryFn: getIsConfigured,
      refetchOnMount: false,
      staleTime: MINUTE_IN_MS * 10,
      enabled: isAuthenticated && !!sharedSecret,
    }),
  };
};
