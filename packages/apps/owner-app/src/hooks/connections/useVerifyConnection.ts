import { useMutation } from '@tanstack/react-query';
import { verifyConnection } from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '@homebase-id/common-app';

export const useVerifyConnection = () => {
  const odinClient = useOdinClientContext();

  const doVerifyConnection = async (odinId: string) => verifyConnection(odinClient, odinId);

  return {
    confirmConnection: useMutation({
      mutationFn: doVerifyConnection,
    }),
  };
};
