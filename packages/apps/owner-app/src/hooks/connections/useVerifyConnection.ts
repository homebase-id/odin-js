import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { verifyConnection } from '@homebase-id/js-lib/network';

export const useVerifyConnection = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const doVerifyConnection = async (odinId: string) => {
    return verifyConnection(dotYouClient, odinId);
  };

  return {
    confirmConnection: useMutation({
      mutationFn: doVerifyConnection,
    }),
  };
};
