import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BlogConfig,
  getChannelDefinition,
  getChannelDefinitionBySlug,
} from '@youfoundation/js-lib/public';

import { ChannelDefinitionVm, parseChannelTemplate } from './useChannels';
import { useDotYouClient } from '../../../..';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { fetchCachedPublicChannels } from '../post/cachedDataHelpers';
import { getChannelOverPeer, getChannelBySlugOverPeer } from '@youfoundation/js-lib/peer';

type useChannelsProps = {
  odinId?: string;
  channelKey?: string;
};

export const useChannel = ({ odinId, channelKey }: useChannelsProps) => {
  const { getDotYouClient, isOwner } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetchChannelData = async ({ channelKey }: useChannelsProps) => {
    if (!channelKey) return null;

    if (!odinId) {
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
      queryKey: ['channel', odinId || dotYouClient.getIdentity(), channelKey],
      queryFn: () => fetchChannelData({ channelKey }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!channelKey,
    }),
  };
};
