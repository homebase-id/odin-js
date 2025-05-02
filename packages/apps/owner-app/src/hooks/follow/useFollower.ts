import { useQuery } from '@tanstack/react-query';
import { fetchFollower } from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '@homebase-id/common-app';

type useFollowerProps = {
  odinId?: string;
};

export const useFollower = ({ odinId }: useFollowerProps) => {
  const odinClient = useOdinClientContext();

  const fetchFollowDetails = async ({ odinId }: { odinId: string }) => {
    const response = await fetchFollower(odinClient, odinId);
    return response;
  };

  return {
    fetch: useQuery({
      queryKey: ['follower', odinId],
      queryFn: () => fetchFollowDetails({ odinId: odinId as string }),
      staleTime: 1000 * 60 * 60, // 1 hour
      enabled: !!odinId,
    }),
  };
};
