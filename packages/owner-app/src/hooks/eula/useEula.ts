import { useMutation, useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';

const useEula = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchRequired = async (): Promise<string | false> => {
    const client = dotYouClient.createAxiosClient();
    const required = await client
      .post<boolean>('/config/system/IsEulaSignatureRequired')
      .then((response) => {
        return !!response?.data;
      });
    if (required) {
      return await client.post<string>('/config/system/GetRequiredEulaVersion').then((response) => {
        return response?.data.toString();
      });
    }
    return false;
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

export default useEula;
