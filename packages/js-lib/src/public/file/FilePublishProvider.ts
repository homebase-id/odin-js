import { DotYouClient } from '../../core/DotYouClient';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { SecurityGroupType } from '../../core/core';
import { getChannelDefinitions, getChannelDrive } from '../posts/PostDefinitionProvider';
import { BlogConfig } from '../posts/PostTypes';
import { DEFAULT_SECTIONS, DEFAULT_PUBLIC_SECTIONS, BASE_RESULT_OPTIONS } from './FileBase';
import { publishFile } from './FileProvider';

export const publishProfile = async (dotYouClient: DotYouClient) => {
  const channels = await getChannelDefinitions(dotYouClient);
  const channelSections = channels
    ?.filter(
      (chnl) =>
        chnl.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
        chnl.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
    )
    .map((channel) => {
      const channelDrive = getChannelDrive(channel.channelId);
      const blogOnChannelQuery: FileQueryParams = {
        targetDrive: channelDrive,
        fileType: [BlogConfig.ChannelDefinitionFileType],
      };
      return {
        name: channel.channelId,
        queryParams: blogOnChannelQuery,
        resultOptions: BASE_RESULT_OPTIONS,
      };
    });

  return await Promise.all([
    await publishFile(dotYouClient, 'sitedata.json', [...DEFAULT_SECTIONS, ...channelSections]),
    await publishFile(dotYouClient, 'public.json', DEFAULT_PUBLIC_SECTIONS, 'allowAllOrigins'),
  ]);
};
