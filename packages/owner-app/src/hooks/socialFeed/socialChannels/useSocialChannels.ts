import { useQuery } from '@tanstack/react-query';
import { getChannelsOverTransit } from '@youfoundation/js-lib';
import useAuth from '../../auth/useAuth';

interface useSocialChannelsProps {
  odinId?: string;
}

const useSocialChannels = ({ odinId }: useSocialChannelsProps) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetch = async ({ odinId }: useSocialChannelsProps) => {
    if (!odinId) {
      return;
    }
    return await getChannelsOverTransit(dotYouClient, odinId);
  };

  return {
    fetch: useQuery(['channels', odinId], () => fetch({ odinId }), {
      enabled: !!odinId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1,
    }),
  };
};

export default useSocialChannels;
