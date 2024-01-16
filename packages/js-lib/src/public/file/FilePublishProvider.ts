import { BuiltInAttributes } from '../../../profile';
import { DotYouClient } from '../../core/DotYouClient';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { SecurityGroupType } from '../../core/core';
import { stringGuidsEqual } from '../../helpers/DataUtil';
import { getChannelDefinitions, getChannelDrive } from '../posts/PostDefinitionProvider';
import { BlogConfig } from '../posts/PostTypes';
import { DEFAULT_SECTIONS, BASE_RESULT_OPTIONS } from './FileBase';
import { publishFile } from './FileProvider';

export const publishProfile = async (
  dotYouClient: DotYouClient,
  dataType?: 'channel' | typeof BuiltInAttributes.Name
) => {
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

  const publishActions = [];

  if (
    !dataType ||
    dataType === 'channel' ||
    DEFAULT_SECTIONS.some(
      (section) =>
        section.queryParams.tagsMatchAtLeastOne?.some((tag) => stringGuidsEqual(tag, dataType))
    )
  )
    publishActions.push(
      publishFile(dotYouClient, 'sitedata.json', [...DEFAULT_SECTIONS, ...channelSections])
    );

  return await Promise.all(publishActions);
};
