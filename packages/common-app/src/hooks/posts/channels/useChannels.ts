import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BlogConfig,
  ChannelDefinition,
  ChannelTemplate,
  getChannelDefinitions,
  GetFile,
} from '@youfoundation/js-lib';

import { useDotYouClient } from '../../../..';
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
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const fetchChannelData = async () => {
    const fetchStaticData = async () => {
      const fileData = await GetFile(dotYouClient, 'blogs.json');
      if (fileData) {
        let channels: ChannelDefinition[] = [];

        fileData.forEach((entry) => {
          const entries = entry.filter(
            (possibleChannel) =>
              possibleChannel.header.fileMetadata.appData.fileType ===
              BlogConfig.ChannelDefinitionFileType
          );
          channels = [
            ...channels,
            ...entries.map((entry) => {
              return { ...entry.payload } as ChannelDefinition;
            }),
          ];
        });

        return channels.map((channel) => {
          return {
            ...channel,
            template: parseChannelTemplate(channel?.templateId),
          } as ChannelDefinitionVm;
        });
      }
    };

    const fetchDynamicData = async () =>
      (await getChannelDefinitions(dotYouClient))?.map((channel) => {
        return {
          ...channel,
          template: parseChannelTemplate(channel?.templateId),
        } as ChannelDefinitionVm;
      });

    const returnData = isOwner
      ? await fetchDynamicData()
      : (await fetchStaticData()) ?? (await fetchDynamicData());
    if (isAuthenticated) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) {
          queryClient.setQueryData(['channels'], dynamicData);
        }
      }, 500);
    }

    return returnData;
  };

  return useQuery(['channels'], fetchChannelData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
