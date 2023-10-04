import { DotYouClient } from '../../core/DotYouClient';
import { FileQueryParams } from '../../core/DriveData/DriveTypes';
import { queryBatchOverTransit, getPayloadOverTransit } from './TransitProvider';
import { BuiltInProfiles } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { AttributeFile, AttributeConfig } from '../../profile/profile';

export const getProfileAttributesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  attributeType?: string
): Promise<AttributeFile[]> => {
  const profileId = BuiltInProfiles.StandardProfileId;
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const queryParams: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    tagsMatchAll: attributeType ? [attributeType] : undefined,
  };
  try {
    const result = await queryBatchOverTransit(dotYouClient, odinId, queryParams);
    if (!result) return [];
    //sort where lowest number is higher priority (!! sort happens in place)
    const searchResults = result.searchResults.sort((a, b) => {
      return a.priority - b.priority;
    });

    return (
      await Promise.all(
        searchResults.map(async (dsr) => {
          const attrPayLoad: AttributeFile | null = await getPayloadOverTransit<AttributeFile>(
            dotYouClient,
            odinId,
            targetDrive,
            dsr,
            result.includeMetadataHeader
          );

          if (!attrPayLoad) return undefined;

          return {
            ...attrPayLoad,
            profileId: profileId,
            acl: dsr.serverMetadata?.accessControlList,
          };
        })
      )
    ).filter((item) => !!item) as AttributeFile[];
  } catch (e) {
    console.error(e);
    return [];
  }
};
