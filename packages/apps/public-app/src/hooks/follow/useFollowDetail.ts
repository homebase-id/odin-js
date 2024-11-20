import { useQuery } from '@tanstack/react-query';
import { fetchFollowDetail } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useFollowDetail = () => {
  const dotYouClient = useDotYouClientContext();

  const isOwner = dotYouClient.isOwner();
  const isAuthenticated = dotYouClient.isAuthenticated();

  const fetchDetail = async () => {
    if (!isAuthenticated || isOwner) {
      return null;
    }

    return await fetchFollowDetail(dotYouClient);
  };

  return { fetch: useQuery({ queryKey: ['followDetail'], queryFn: fetchDetail }) };
};
