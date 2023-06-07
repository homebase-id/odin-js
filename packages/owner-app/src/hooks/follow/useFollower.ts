import { useQuery } from '@tanstack/react-query';
import { fetchFollower } from '@youfoundation/js-lib/network';

import useAuth from '../auth/useAuth';

type useFollowerProps = {
  odinId?: string;
};

const useFollower = ({ odinId }: useFollowerProps) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchFollowDetails = async ({ odinId }: { odinId: string }) => {
    const response = await fetchFollower(dotYouClient, odinId);
    return response;
  };

  return {
    fetch: useQuery(['follower', odinId], () => fetchFollowDetails({ odinId: odinId as string }), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId,
    }),
  };
};

export default useFollower;
