import { useQuery } from '@tanstack/react-query';
import { fetchFollowDetail } from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '@homebase-id/common-app';

export const useFollowDetail = () => {
  const odinClient = useOdinClientContext();

  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();

  const fetchDetail = async () => {
    if (!isAuthenticated || isOwner) {
      return null;
    }

    return await fetchFollowDetail(odinClient);
  };

  return { fetch: useQuery({ queryKey: ['followDetail'], queryFn: fetchDetail }) };
};
