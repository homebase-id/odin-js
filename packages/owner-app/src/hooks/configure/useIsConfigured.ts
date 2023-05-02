import { useQuery } from '@tanstack/react-query';
import { isConfigured } from '../../provider/system/SystemProvider';
import useAuth from '../auth/useAuth';

const useIsConfigured = () => {
  const { getSharedSecret, isAuthenticated } = useAuth();
  const dotYouClient = useAuth().getDotYouClient();

  const getIsConfigured = async () => {
    if (!isAuthenticated) {
      console.log('getIsConfigured: Not authenticated');
      return;
    }

    const sharedSecret = getSharedSecret();
    if (!sharedSecret) {
      console.log('getIsConfigured: No shared secret');
      return;
    }
    return await isConfigured(dotYouClient);
  };

  return {
    isConfigured: useQuery(['initialized'], getIsConfigured, {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isAuthenticated,
    }),
  };
};

export default useIsConfigured;
