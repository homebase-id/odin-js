import { useQuery } from '@tanstack/react-query';
import {
  ChannelDefinition,
  ChannelTemplate,
  DotYouClient,
  getChannelDefinitions,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
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

const useChannels = () => {
  const { getSharedSecret, getApiType } = useAuth();

  const fetchChannelData = async () => {
    const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

    return (await getChannelDefinitions(dotYouClient))?.map((channel) => {
      return {
        ...channel,
        template: parseChannelTemplate(channel?.templateId),
      } as ChannelDefinitionVm;
    });
  };

  return useQuery(['channels'], fetchChannelData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

export default useChannels;
