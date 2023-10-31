import { useQuery } from '@tanstack/react-query';
import { fetchFollowDetail } from '@youfoundation/js-lib/network';
import { useAuth } from '../auth/useAuth';

export const useFollowDetail = () => {
  const { getDotYouClient, isAuthenticated, isOwner } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchDetail = async () => {
    if (!isAuthenticated || isOwner) {
      return null;
    }

    return await fetchFollowDetail(dotYouClient);
  };

  return { fetch: useQuery({ queryKey: ['followDetail'], queryFn: fetchDetail }) };
};
