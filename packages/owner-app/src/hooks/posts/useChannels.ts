import { useQuery } from '@tanstack/react-query';
import { ChannelDefinition, ChannelTemplate, getChannelDefinitions } from '@youfoundation/js-lib';
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
  const dotYouClient = useAuth().getDotYouClient();
  const fetchChannelData = async () => {
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
