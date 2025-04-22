import { OdinClient } from '../../core/OdinClient';
import {
  FileQueryParams,
  queryBatch,
  GetBatchQueryResultOptions,
  HomebaseFile,
  TargetDrive,
  getContentFromHeaderOrPayload,
} from '../../core/core';
import { compareAcl } from '../../helpers/DataUtil';
import { GetTargetDriveFromProfileId } from '../profile';
import { AttributeConfig } from './AttributeConfig';
import { Attribute } from './AttributeDataTypes';

const sortAttrs = (
  a: HomebaseFile<Attribute | undefined>,
  b: HomebaseFile<Attribute | undefined>
) =>
  compareAcl(a.serverMetadata?.accessControlList, b.serverMetadata?.accessControlList) ||
  (a.fileMetadata.appData.content?.priority || 0) - (b.fileMetadata.appData.content?.priority || 0);

//Gets all attributes available to the caller
export const getProfileAttributes = async (
  odinClient: OdinClient,
  profileId: string,
  sectionId: string | undefined,
  types: string[] | undefined,
  pageSize: number = 10
): Promise<HomebaseFile<Attribute>[]> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [AttributeConfig.AttributeFileType],
    groupId: sectionId ? [sectionId] : undefined,
    tagsMatchAtLeastOne: types,
  };

  const result = await queryBatch(odinClient, qp, {
    maxRecords: pageSize,
    includeMetadataHeader: true,
  });

  const attributes: HomebaseFile<Attribute>[] = (
    await Promise.all(
      result.searchResults.map(async (dsr) =>
        homebaseFileToProfileAttribute(odinClient, dsr, targetDrive, result.includeMetadataHeader)
      )
    )
  ).filter((attr) => !!attr) as HomebaseFile<Attribute>[];

  return attributes.sort(sortAttrs);
};

export const getProfileAttribute = async (
  odinClient: OdinClient,
  profileId: string,
  id: string
): Promise<HomebaseFile<Attribute | undefined> | null> => {
  const targetDrive = GetTargetDriveFromProfileId(profileId);
  const qp: FileQueryParams = {
    targetDrive: targetDrive,
    clientUniqueIdAtLeastOne: [id],
    fileType: [AttributeConfig.AttributeFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  const result = await queryBatch(odinClient, qp, ro);

  if (result.searchResults.length == 0) return null;
  if (result.searchResults.length > 1) {
    console.warn(
      `Attribute Id [${id}] in profile [${profileId}] has more than one file. Using latest`
    );
  }

  const dsr: HomebaseFile = result.searchResults[0];
  return homebaseFileToProfileAttribute(
    odinClient,
    dsr,
    targetDrive,
    result.includeMetadataHeader
  );
};

export const homebaseFileToProfileAttribute = async (
  odinClient: OdinClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<Attribute | undefined> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<Attribute>(
      odinClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );

    const attributeFile: HomebaseFile<Attribute | undefined> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: attrContent || undefined,
        },
      },
    };

    return attributeFile;
  } catch (ex) {
    console.error('[odin-js] failed to get the payload of a dsr', dsr, ex);
    return null;
  }
};
