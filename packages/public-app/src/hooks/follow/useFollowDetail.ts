import { useQuery } from '@tanstack/react-query';
import { fetchFollowDetail } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useFollowDetail = () => {
  const { getDotYouClient, isAuthenticated, isOwner } = useAuth();
  const dotYouClient = getDotYouClient();

  const fetchDetail = async () => {
    if (!isAuthenticated || isOwner) {
      return null;
    }

    return await fetchFollowDetail(dotYouClient);
  };

  return { fetch: useQuery(['followDetail'], fetchDetail) };
};

export default useFollowDetail;
