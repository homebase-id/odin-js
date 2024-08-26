import { DotYouClient } from '@homebase-id/js-lib/core';

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
      console.warn(error);
      return null;
    });
};
