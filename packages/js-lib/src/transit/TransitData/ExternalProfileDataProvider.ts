import { DotYouClient } from '../../core/DotYouClient';
import { queryBatchOverTransit, getContentFromHeaderOrPayloadOverTransit } from './TransitProvider';
import { BuiltInProfiles } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { AttributeFile, AttributeConfig } from '../../profile/profile';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';

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

    let attributes = (
      await Promise.all(
        result.searchResults.map(async (dsr) => {
          const attrPayLoad: AttributeFile | null =
            await getContentFromHeaderOrPayloadOverTransit<AttributeFile>(
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
            aclPriority: dsr.priority,
            fileId: dsr.fileId,
          };
        })
      )
    ).filter((item) => !!item) as AttributeFile[];

    attributes = attributes.sort(
      (a, b) => (a.aclPriority || 0) - (b.aclPriority || 0) || a.priority - b.priority
    );

    return attributes;
  } catch (e) {
    console.error(e);
    return [];
  }
};
