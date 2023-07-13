import { useQuery } from '@tanstack/react-query';
import useAuth from '../auth/useAuth';
import { getRecoveryKey } from '../../provider/auth/RecoveryProvider';

const useRecoveryKey = () => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchKey = async () => {
    return await getRecoveryKey(dotYouClient);
  };

  return {
    fetchKey: useQuery(['recoveryKey'], fetchKey),
  };
};

export default useRecoveryKey;
