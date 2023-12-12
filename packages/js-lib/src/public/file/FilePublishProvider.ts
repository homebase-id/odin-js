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
        chnl.serverMetadata?.accessControlList?.requiredSecurityGroup ===
          SecurityGroupType.Anonymous ||
        chnl.serverMetadata?.accessControlList?.requiredSecurityGroup ===
          SecurityGroupType.Authenticated
    )
    .map((channel) => {
      const channelDrive = getChannelDrive(channel.fileMetadata.appData.uniqueId as string);
      const blogOnChannelQuery: FileQueryParams = {
        targetDrive: channelDrive,
        fileType: [BlogConfig.ChannelDefinitionFileType],
      };
      return {
        name: channel.fileMetadata.appData.uniqueId as string,
        queryParams: blogOnChannelQuery,
        resultOptions: BASE_RESULT_OPTIONS,
      };
    });

  return await Promise.all([
    await publishFile(dotYouClient, 'sitedata.json', [...DEFAULT_SECTIONS, ...channelSections]),
    await publishFile(dotYouClient, 'public.json', DEFAULT_PUBLIC_SECTIONS, 'allowAllOrigins'),
  ]);
};
