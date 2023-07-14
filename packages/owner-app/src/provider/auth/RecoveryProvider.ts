import { DotYouClient } from '@youfoundation/js-lib/core';

export interface RecoveryKeyResponse {
  key: string;
  created: {
    milliseconds: number;
    seconds: number;
  };
}

export const getRecoveryKey = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<RecoveryKeyResponse>(`/security/recovery-key`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.log(error);
      return { key: 'BGQfeBBJG9JMVTa6UhEaHg7KgG' };
    });
};
