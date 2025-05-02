import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChannelDefinition,
  ChannelTemplate,
  getChannelDefinitions,
} from '@homebase-id/js-lib/public';

import { HomebaseFile } from '@homebase-id/js-lib/core';
import { fetchCachedPublicChannels } from '../post/cachedDataHelpers';
import { useOdinClientContext } from '../../auth/useOdinClientContext';
export interface ChannelDefinitionVm extends ChannelDefinition {
  template: ChannelTemplate;
}

export const parseChannelTemplate = (templateId: number | undefined) => {
  return parseInt(templateId + '') === ChannelTemplate.LargeCards
    ? ChannelTemplate.LargeCards
    : parseInt(templateId + '') === ChannelTemplate.MasonryLayout
      ? ChannelTemplate.MasonryLayout
      : ChannelTemplate.ClassicBlog;
};

export const useChannels = ({
  isAuthenticated,
  isOwner,
}: {
  isAuthenticated: boolean;
  isOwner: boolean;
}) => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const fetchChannelData = async () => {
    const fetchDynamicData = async () => {
      try {
        return (await getChannelDefinitions(odinClient))?.map((channel) => {
          return {
            ...channel,
            fileMetadata: {
              ...channel.fileMetadata,
              appData: {
                ...channel.fileMetadata.appData,
                content: {
                  ...channel.fileMetadata.appData.content,
                  template: parseChannelTemplate(
                    channel?.fileMetadata?.appData?.content?.templateId
                  ),
                },
              },
            },
          } as HomebaseFile<ChannelDefinitionVm>;
        });
      } catch (e) {
        console.error('[useChannels] failed to fetch dynamic data', e);
      }
    };

    const returnData = isOwner
      ? await fetchDynamicData()
      : ((await fetchCachedPublicChannels(odinClient)) ?? (await fetchDynamicData()));

    if (isAuthenticated && !isOwner) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) queryClient.setQueryData(['channels'], dynamicData);
      }, 500);
    }

    return returnData;
  };

  return useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannelData,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const invalidateChannels = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['channels'] });
};

export const updateCacheChannels = (
  queryClient: QueryClient,
  transformFn: (
    data: HomebaseFile<ChannelDefinitionVm>[]
  ) => HomebaseFile<ChannelDefinitionVm>[] | undefined
) => {
  const queryData = queryClient.getQueryData<HomebaseFile<ChannelDefinitionVm>[]>(['channels']);
  if (!queryData) return;

  const newQueryData = transformFn(queryData);
  if (!newQueryData) return;

  queryClient.setQueryData(['channels'], newQueryData);
  return queryData;
};
