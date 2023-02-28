import { AttributeConfig } from '../../core/AttributeData/AttributeConfig';
import { AttributeFile } from '../../core/AttributeData/AttributeDataTypes';
import { DotYouClient } from '../../core/DotYouClient';
import { FileQueryParams } from '../../core/DriveData/DriveTypes';
import {
  queryBatchOverTransit,
  getPayloadOverTransit,
} from '../../core/TransitData/TransitProvider';
import { BuiltInProfiles } from '../../profile/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileDefinitionProvider';

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
          dsr.fileId,
          dsr.fileMetadata,
          dsr.sharedSecretEncryptedKeyHeader,
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
