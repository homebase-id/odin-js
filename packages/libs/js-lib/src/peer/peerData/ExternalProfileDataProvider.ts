import { OdinClient } from '../../core/OdinClient';
import { BuiltInProfiles } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionManager';
import { Attribute, AttributeConfig } from '../../profile/profile';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { queryBatchOverPeer } from './Query/PeerDriveQueryService';
import { getContentFromHeaderOrPayloadOverPeer } from './File/PeerFileProvider';
import { HomebaseFile, TargetDrive } from '../../core/DriveData/File/DriveFileTypes';
import { compareAcl } from '../../helpers/DataUtil';

export const getProfileAttributesOverPeer = async (
  odinClient: OdinClient,
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
    const result = await queryBatchOverPeer(odinClient, odinId, queryParams);
    if (!result) return [];

    let attributes: HomebaseFile<Attribute>[] = (
      await Promise.all(
        result.searchResults.map(async (dsr) =>
          dsrToAttributeFileOverPeer(
            odinClient,
            odinId,
            dsr,
            targetDrive,
            result.includeMetadataHeader
          )
        )
      )
    ).filter((attr) => !!attr) as HomebaseFile<Attribute>[];

    attributes = attributes.sort((a, b) =>
      compareAcl(a.serverMetadata?.accessControlList, b.serverMetadata?.accessControlList)
    );

    return attributes;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const dsrToAttributeFileOverPeer = async (
  odinClient: OdinClient,
  odinId: string,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<Attribute> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayloadOverPeer<Attribute>(
      odinClient,
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
