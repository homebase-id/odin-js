import { DotYouClient } from '../../core/DotYouClient';
import { BuiltInProfiles } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { Attribute, AttributeConfig } from '../../profile/profile';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { queryBatchOverTransit } from './Query/TransitDriveQueryProvider';
import { getContentFromHeaderOrPayloadOverTransit } from './File/TransitFileProvider';
import { DriveSearchResult, TargetDrive } from '../../core/DriveData/File/DriveFileTypes';

export const getProfileAttributesOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  attributeType?: string
): Promise<DriveSearchResult<Attribute>[]> => {
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

    let attributes: DriveSearchResult<Attribute>[] = (
      await Promise.all(
        result.searchResults.map(async (dsr) =>
          dsrToAttributeFileOverTransit(
            dotYouClient,
            odinId,
            dsr,
            targetDrive,
            result.includeMetadataHeader
          )
        )
      )
    ).filter((attr) => !!attr) as DriveSearchResult<Attribute>[];

    attributes = attributes.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    return attributes;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const dsrToAttributeFileOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<DriveSearchResult<Attribute> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayloadOverTransit<Attribute>(
      dotYouClient,
      odinId,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const attributeFile: DriveSearchResult<Attribute> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: attrContent,
        },
      },
    };

    return attributeFile;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the payload of a dsr', dsr, ex);
    return null;
  }
};
