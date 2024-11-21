import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BlogConfig,
  ChannelDefinition,
  getChannelDefinition,
  getChannelDefinitionBySlug,
} from '@homebase-id/js-lib/public';

import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';
import { useDotYouClientContext } from '../../../..';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { fetchCachedPublicChannels } from '../post/cachedDataHelpers';
import { getChannelOverPeer, getChannelBySlugOverPeer } from '@homebase-id/js-lib/peer';

type useChannelsProps = {
  odinId?: string;
  channelKey?: string;
};

export const useChannel = ({ odinId, channelKey }: useChannelsProps) => {
  const dotYouClient = useDotYouClientContext();
  const isOwner = dotYouClient.isOwner;
  const queryClient = useQueryClient();

  const fetchChannelData = async ({ channelKey }: useChannelsProps) => {
    if (!channelKey) return null;

    if (!odinId || odinId === dotYouClient.getHostIdentity()) {
      const cachedChannels = queryClient.getQueryData<HomebaseFile<ChannelDefinitionVm>[]>([
        'channels',
      ]);
      if (cachedChannels) {
        const foundChannel = cachedChannels.find(
          (chnl) =>
            stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, channelKey) ||
            chnl.fileMetadata.appData.content.slug === channelKey
        );
        if (foundChannel) return foundChannel;
      }

      const channel = (await fetchCachedPublicChannels(dotYouClient))?.find(
        (chnl) =>
          stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, channelKey) ||
          chnl.fileMetadata.appData.content.slug === channelKey
      );
      if (channel && !isOwner) return channel;

      const directFetchOfChannel =
        (await getChannelDefinitionBySlug(dotYouClient, channelKey)) ||
        (await getChannelDefinition(dotYouClient, channelKey));

      if (directFetchOfChannel) {
        return {
          ...directFetchOfChannel,
          fileMetadata: {
            ...directFetchOfChannel.fileMetadata,
            appData: {
              ...directFetchOfChannel.fileMetadata.appData,
              content: {
                ...directFetchOfChannel.fileMetadata.appData.content,
                template: parseChannelTemplate(
                  directFetchOfChannel?.fileMetadata.appData.content?.templateId
                ),
              },
            },
          },
        } as HomebaseFile<ChannelDefinitionVm>;
      }
      return null;
    } else {
      // Optimization to not fetch similar content, might break if the public channel is adapted by the user... Perhaps we should always keep the slug?
      if (channelKey === BlogConfig.PublicChannelId) return BlogConfig.PublicChannelNewDsr;

      return (
        (await getChannelBySlugOverPeer(dotYouClient, odinId, channelKey)) ||
        (await getChannelOverPeer(dotYouClient, odinId, channelKey)) ||
        null
      );
    }
  };

  return {
    fetch: useQuery({
      queryKey: ['channel', odinId || dotYouClient.getHostIdentity(), channelKey],
      queryFn: () => fetchChannelData({ channelKey }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!channelKey,
    }),
  };
};

export const invalidateChannel = (queryClient: QueryClient, odinId: string, channelKey: string) => {
  queryClient.invalidateQueries({ queryKey: ['channel', odinId, channelKey] });
};

export const updateCacheChannel = (
  queryClient: QueryClient,
  odinId: string,
  channelKey: string,
  transformFn: (
    data: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | null
  ) => HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | null
) => {
  const queryData = queryClient.getQueryData<
    HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | null
  >(['channel', odinId, channelKey]);
  if (!queryData) return;

  const newQueryData = transformFn(queryData);
  if (!newQueryData) return;

  queryClient.setQueryData(['channel', odinId, channelKey], newQueryData);
};
