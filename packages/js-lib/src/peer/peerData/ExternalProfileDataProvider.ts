import { DotYouClient } from '../../core/DotYouClient';
import { BuiltInProfiles } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { Attribute, AttributeConfig } from '../../profile/profile';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { queryBatchOverPeer } from './Query/PeerDriveQueryProvider';
import { getContentFromHeaderOrPayloadOverPeer } from './File/PeerFileProvider';
import { HomebaseFile, TargetDrive } from '../../core/DriveData/File/DriveFileTypes';

export const getProfileAttributesOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  attributeType?: string | string[]
): Promise<HomebaseFile<Attribute>[]> => {
  const profileId = BuiltInProfiles.StandardProfileId;
  const targetDrive = GetTargetDriveFromProfileId(profileId);

  const queryParams: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    tagsMatchAtLeastOne: attributeType
      ? Array.isArray(attributeType)
        ? attributeType
        : [attributeType]
      : undefined,
  };
  try {
    const result = await queryBatchOverPeer(dotYouClient, odinId, queryParams);
    if (!result) return [];

    let attributes: HomebaseFile<Attribute>[] = (
      await Promise.all(
        result.searchResults.map(async (dsr) =>
          dsrToAttributeFileOverPeer(
            dotYouClient,
            odinId,
            dsr,
            targetDrive,
            result.includeMetadataHeader
          )
        )
      )
    ).filter((attr) => !!attr) as HomebaseFile<Attribute>[];

    attributes = attributes.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    return attributes;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const dsrToAttributeFileOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<Attribute> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayloadOverPeer<Attribute>(
      dotYouClient,
      odinId,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const attributeFile: HomebaseFile<Attribute> = {
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
    console.error('[odin-js] failed to get the payload of a dsr', dsr, ex);
    return null;
  }
};
