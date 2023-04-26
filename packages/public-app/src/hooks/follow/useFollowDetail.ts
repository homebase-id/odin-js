import { useQuery } from '@tanstack/react-query';
import { DotYouClient, fetchFollowDetail } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useFollowDetail = () => {
  const { getSharedSecret, getApiType, isAuthenticated, isOwner } = useAuth();
  const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

  const fetchDetail = async () => {
    if (!isAuthenticated || isOwner) {
      return null;
    }

    return await fetchFollowDetail(dotYouClient);
  };

  return { fetch: useQuery(['followDetail'], fetchDetail) };
};

export default useFollowDetail;
