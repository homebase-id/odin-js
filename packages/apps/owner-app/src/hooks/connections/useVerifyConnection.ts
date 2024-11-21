import { useMutation } from '@tanstack/react-query';
import { verifyConnection } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useVerifyConnection = () => {
  const dotYouClient = useDotYouClientContext();

  const doVerifyConnection = async (odinId: string) => verifyConnection(dotYouClient, odinId);

  return {
    confirmConnection: useMutation({
      mutationFn: doVerifyConnection,
    }),
  };
};
