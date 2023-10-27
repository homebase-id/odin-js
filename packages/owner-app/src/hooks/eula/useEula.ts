import { useMutation, useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';

export const useEula = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchRequired = async (): Promise<string | false> => {
    const client = dotYouClient.createAxiosClient();
    const required = await client
      .post<boolean>('/config/system/iseulasignaturerequired')
      .then((response) => !!response?.data);
    if (!required) return false;
    return await client
      .post<{ version: string }>('/config/system/getrequiredeulaversion')
      .then((response) => response?.data?.version || false)
      .catch(() => false);
  };

  const markAccepted = (version: string) => {
    const client = dotYouClient.createAxiosClient();
    return client
      .post('/config/system/MarkEulaSigned', {
        version,
      })
      .then(() => {
        return true;
      })
      .catch(() => false);
  };

  return {
    isEulaSignatureRequired: useQuery(['eula'], fetchRequired),
    markEulaAsAccepted: useMutation(markAccepted),
  };
};
