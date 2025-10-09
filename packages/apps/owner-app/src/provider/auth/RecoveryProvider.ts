import {DotYouClient} from '@homebase-id/js-lib/core';

export interface RecoveryKeyResult {
  key: string | null;
  created: number;
  nextViewableDate: number;
}

export interface RequestRecoveryKeyResult {
  nextViewableDate: number;
}

export const requestRecoveryKey = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();
  return await axiosClient
    .post<RequestRecoveryKeyResult>(`/security/request-recovery-key`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
}

export const getRecoveryKey = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<RecoveryKeyResult>(`/security/recovery-key`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.warn(error);
      return null;
    });
};

export const confirmUserStoredKey = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .post(`/security/confirm-stored-recovery-key`)
    .then((response) => {
      return response.status == 200;
    })
    .catch((error) => {
      console.warn(error);
      return false;
    });
};

