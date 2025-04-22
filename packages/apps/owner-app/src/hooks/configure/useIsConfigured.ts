import { useQuery } from '@tanstack/react-query';
import { isConfigured } from '../../provider/system/SystemProvider';
import { FIRST_RUN_TOKEN_STORAGE_KEY } from './useInit';
import { useOdinClientContext } from '@homebase-id/common-app';

const LOCAL_STORAGE_KEY = 'isConfigured';
const MINUTE_IN_MS = 60000;

export const useIsConfigured = () => {
  const isAuthenticated = useOdinClientContext().isAuthenticated();
  const odinClient = useOdinClientContext();

  const getIsConfigured = async () => {
    if (!isAuthenticated) {
      console.warn('getIsConfigured: Not authenticated');
      return;
    }

    // Only check isConfigured once per app version
    if (
      localStorage.getItem(LOCAL_STORAGE_KEY) === import.meta.env.VITE_VERSION &&
      import.meta.env.PROD
    )
      return true;

    const result = await isConfigured(odinClient);
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
      staleTime: MINUTE_IN_MS * 10,
      enabled: isAuthenticated,
    }),
  };
};
