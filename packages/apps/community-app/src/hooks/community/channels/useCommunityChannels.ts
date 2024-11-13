import { QueryClient, useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { CommunityChannel, getCommunityChannels } from '../../../providers/CommunityProvider';
import { DeletedHomebaseFile, HomebaseFile } from '@homebase-id/js-lib/core';
import { formatGuidId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';

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
      staleTime: 1000 * 60 * 60, // 1h
    }),
  };
};

export const insertNewCommunityChannel = (
  queryClient: QueryClient,
  updatedChannel: HomebaseFile<CommunityChannel> | DeletedHomebaseFile<unknown>,
  communityId: string
) => {
  const existingChannels = queryClient.getQueryData<HomebaseFile<CommunityChannel>[]>([
    'community-channels',
    formatGuidId(communityId),
  ]);
  if (!existingChannels) return;

  const allButThisOne = existingChannels.filter(
    (channel) =>
      !stringGuidsEqual(
        channel.fileMetadata.appData.uniqueId,
        updatedChannel.fileMetadata.appData.uniqueId
      ) && !stringGuidsEqual(channel.fileId, updatedChannel.fileId)
  );

  const newChannels =
    updatedChannel.fileState === 'active' ? [...allButThisOne, updatedChannel] : allButThisOne;
  queryClient.setQueryData(['community-channels', formatGuidId(communityId)], newChannels);
};

export const removeCommunityChannel = (
  queryClient: QueryClient,
  removedChannel: HomebaseFile<unknown>,
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
        removedChannel.fileMetadata.appData.uniqueId
      ) ||
      !stringGuidsEqual(
        channel.fileMetadata.globalTransitId,
        removedChannel.fileMetadata.globalTransitId
      ) ||
      !stringGuidsEqual(channel.fileId, removedChannel.fileId)
  );
  queryClient.setQueryData(['community-channels', communityId], allButThisOne);
};
