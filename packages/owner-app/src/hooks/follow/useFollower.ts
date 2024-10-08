import { useQuery } from '@tanstack/react-query';
import { fetchFollower } from '@homebase-id/js-lib/network';

import { useAuth } from '../auth/useAuth';

type useFollowerProps = {
  odinId?: string;
};

export const useFollower = ({ odinId }: useFollowerProps) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchFollowDetails = async ({ odinId }: { odinId: string }) => {
    const response = await fetchFollower(dotYouClient, odinId);
    return response;
  };

  return {
    fetch: useQuery({
      queryKey: ['follower', odinId],
      queryFn: () => fetchFollowDetails({ odinId: odinId as string }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!odinId,
    }),
  };
};
