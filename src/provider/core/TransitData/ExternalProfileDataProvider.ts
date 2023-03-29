import { AttributeConfig } from '../AttributeData/AttributeConfig';
import { AttributeFile } from '../AttributeData/AttributeDataTypes';
import { DotYouClient } from '../DotYouClient';
import { FileQueryParams } from '../DriveData/DriveTypes';
import { queryBatchOverTransit, getPayloadOverTransit } from './TransitProvider';
import { BuiltInProfiles } from '../ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../ProfileData/ProfileDefinitionProvider';

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

  const result = await queryBatchOverTransit(dotYouClient, odinId, queryParams);

  //sort where lowest number is higher priority (!! sort happens in place)
  const searchResults = result.searchResults.sort((a, b) => {
    return a.priority - b.priority;
  });

  return (
    await Promise.all(
      searchResults.map(async (dsr) => {
        const attrPayLoad: AttributeFile = await getPayloadOverTransit<AttributeFile>(
          dotYouClient,
          odinId,
          targetDrive,
          dsr,
          result.includeMetadataHeader
        );

        return {
          ...attrPayLoad,
          profileId: profileId,
          acl: dsr.serverMetadata?.accessControlList,
        };
      })
    )
  ).filter((item) => !!item);
};
