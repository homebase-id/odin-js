import { QueryClient, useQuery } from '@tanstack/react-query';
import { useOdinClientContext } from '@homebase-id/common-app';
import { CommunityChannel, getCommunityChannels } from '../../../providers/CommunityProvider';
import { DeletedHomebaseFile, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { formatGuidId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const useCommunityChannels = (props: { odinId?: string; communityId?: string }) => {
  const { odinId, communityId } = props;
  const odinClient = useOdinClientContext();

  const fetchChannels = async (odinId: string, communityId: string) => {
    return await getCommunityChannels(odinClient, odinId, communityId);
  };

  return {
    fetch: useQuery({
      queryKey: ['community-channels', formatGuidId(communityId)],
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
  updateCacheCommunityChannels(queryClient, communityId, (data) => {
    const allButThisOne = data.filter(
      (channel) =>
        !stringGuidsEqual(
          channel.fileMetadata.appData.uniqueId,
          updatedChannel.fileMetadata.appData.uniqueId
        ) && !stringGuidsEqual(channel.fileId, updatedChannel.fileId)
    );

    return updatedChannel.fileState === 'active'
      ? [...allButThisOne, updatedChannel]
      : allButThisOne;
  });
};

export const removeCommunityChannel = (
  queryClient: QueryClient,
  removedChannel: HomebaseFile<unknown>,
  communityId: string
) => {
  updateCacheCommunityChannels(queryClient, communityId, (data) =>
    data.filter(
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
    )
  );
};

export const invalidateCommunityChannels = (queryClient: QueryClient, communityId?: string) => {
  queryClient.invalidateQueries({
    queryKey: ['community-channels', formatGuidId(communityId)].filter(Boolean),
    exact: !!communityId,
  });
};

export const updateCacheCommunityChannels = (
  queryClient: QueryClient,
  communityId: string,
  transformFn: (
    data: HomebaseFile<CommunityChannel>[]
  ) => (HomebaseFile<CommunityChannel> | NewHomebaseFile<CommunityChannel>)[] | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<CommunityChannel>[]>([
    'community-channels',
    formatGuidId(communityId),
  ]);
  if (!currentData) return;

  const updatedData = transformFn(currentData);
  if (!updatedData) return;

  queryClient.setQueryData(['community-channels', formatGuidId(communityId)], updatedData);
  return currentData;
};
