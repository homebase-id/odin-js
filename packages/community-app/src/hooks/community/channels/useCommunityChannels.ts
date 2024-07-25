import { QueryClient, useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { CommunityChannel, getCommunityChannels } from '../../../providers/CommunityProvider';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const useCommunityChannels = (props: { communityId?: string }) => {
  const { communityId } = props;
  const dotYouClient = useDotYouClientContext();

  const fetchChannels = async (communityId: string) => {
    return await getCommunityChannels(dotYouClient, communityId);
  };

  return {
    fetch: useQuery({
      queryKey: ['community-channels', communityId],
      queryFn: async () => fetchChannels(communityId as string),
      enabled: !!communityId,
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
