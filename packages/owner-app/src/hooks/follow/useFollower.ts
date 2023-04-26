import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, fetchFollower } from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

type useFollowerProps = {
  odinId?: string;
};

const useFollower = ({ odinId }: useFollowerProps) => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchFollowDetails = async ({ odinId }: { odinId?: string }) => {
    const response = await fetchFollower(dotYouClient, odinId);
    return response;
  };

  return {
    fetch: useQuery(['follower', odinId], () => fetchFollowDetails({ odinId }), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId,
    }),
  };
};

export default useFollower;
