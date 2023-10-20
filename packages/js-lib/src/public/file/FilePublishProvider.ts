import { DotYouClient } from '../../core/DotYouClient';
import { FileQueryParams } from '../../core/DriveData/DriveTypes';
import { getChannelDefinitions, getChannelDrive } from '../posts/PostDefinitionProvider';
import { BlogConfig } from '../posts/PostTypes';
import { DEFAULT_SECTIONS, DEFAULT_PUBLIC_SECTIONS, BASE_RESULT_OPTIONS } from './FileBase';
import { publishFile } from './FileProvider';

export const publishProfile = async (dotYouClient: DotYouClient) => {
  return await Promise.all([
    await publishFile(dotYouClient, 'sitedata.json', DEFAULT_SECTIONS),
    await publishFile(dotYouClient, 'public.json', DEFAULT_PUBLIC_SECTIONS, 'allowAllOrigins'),
  ]);
};

export const publishBlog = async (dotYouClient: DotYouClient) => {
  const channels = await getChannelDefinitions(dotYouClient);
  const sections = channels.map((channel) => {
    const channelDrive = getChannelDrive(channel.channelId);
    const blogOnChannelQuery: FileQueryParams = {
      targetDrive: channelDrive,
      fileType: [BlogConfig.PostFileType, BlogConfig.ChannelDefinitionFileType],
    };
    return {
      name: channel.channelId,
      queryParams: blogOnChannelQuery,
      resultOptions: BASE_RESULT_OPTIONS,
    };
  });

  if (!sections.length) {
    return;
  }
  return await publishFile(dotYouClient, 'blogs.json', [...sections]);
};
