import { useDotYouClient } from '@youfoundation/common-app';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';

export const useConnectionGrantStatus = ({ odinId }: { odinId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return {
    fetchStatus: async () => {
      const axiosClient = dotYouClient.createAxiosClient();
      const jsonData = await axiosClient
        .post(`/circles/connections/troubleshooting-info`, { odinId: odinId })
        .then((res) => res.data);

      const stringified = jsonStringify64(jsonData);
      const url = window.URL.createObjectURL(
        new Blob([stringified], { type: 'application/json;charset=utf-8' })
      );
      return url;
    },
  };
};
