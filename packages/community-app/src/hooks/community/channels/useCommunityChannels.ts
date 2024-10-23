import { QueryClient, useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { CommunityChannel, getCommunityChannels } from '../../../providers/CommunityProvider';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const useCommunityChannels = (props: { odinId?: string; communityId?: string }) => {
  const { odinId, communityId } = props;
  const dotYouClient = useDotYouClientContext();

  const fetchChannels = async (odinId: string, communityId: string) => {
    return await getCommunityChannels(dotYouClient, odinId, communityId);
  };

  return {
    fetch: useQuery({
      queryKey: ['community-channels', communityId],
      queryFn: async () => fetchChannels(odinId as string, communityId as string),
      enabled: !!communityId && !!odinId,
    }),
  };
};

export const insertNewCommunityChannel = (
  queryClient: QueryClient,
  updatedChannel: HomebaseFile<CommunityChannel>,
  communityId: string
) => {
  const existingChannels = queryClient.getQueryData<HomebaseFile<CommunityChannel>[]>([
    'community-channels',
    communityId,
  ]);
  if (!existingChannels) return;

  const allButThisOne = existingChannels.filter(
    (channel) =>
      !stringGuidsEqual(
        channel.fileMetadata.appData.uniqueId,
        updatedChannel.fileMetadata.appData.uniqueId
      )
  );
  queryClient.setQueryData(['community-channels', communityId], [...allButThisOne, updatedChannel]);
};
