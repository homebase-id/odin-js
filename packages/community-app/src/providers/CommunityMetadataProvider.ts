import {
  DotYouClient,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getContentFromHeaderOrPayload,
  HomebaseFile,
  NewHomebaseFile,
  queryBatch,
  SecurityGroupType,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '@youfoundation/js-lib/core';
import { jsonStringify64, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';

export interface CommunityMetadata {
  lastReadTime: number;
  pinnedChannels: string[];
  communityId: string;
}

export const COMMUNITY_METADATA_FILE_TYPE = 7011;

export const uploadCommunityMetadata = async (
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata>,
  onVersionConflicht?: () => Promise<void | UploadResult> | void
): Promise<UploadResult | undefined> => {
  if (!definition.fileMetadata.appData.tags) {
    throw new Error('CommunityMetadata must have tags');
  }

  if (
    !definition.fileMetadata.appData.tags.some((tag) =>
      stringGuidsEqual(tag, definition.fileMetadata.appData.content.communityId)
    )
  ) {
    throw new Error('CommunityMetadata must have a tag that matches the communityId');
  }

  const targetDrive = getTargetDriveFromCommunityId(
    definition.fileMetadata.appData.content.communityId
  );
  const instructionSet: UploadInstructionSet = {
    storageOptions: {
      overwriteFileId: definition.fileId,
      drive: targetDrive,
    },
  };

  const metadata: UploadFileMetadata = {
    versionTag: definition.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      tags: definition.fileMetadata.appData.tags,
      uniqueId: definition.fileMetadata.appData.uniqueId,
      fileType: COMMUNITY_METADATA_FILE_TYPE,
      content: jsonStringify64(definition.fileMetadata.appData.content),
    },
    isEncrypted: true,
    accessControlList: {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    undefined,
    undefined,
    true,
    onVersionConflicht
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

export const getCommunityMetadata = async (
  dotYouClient: DotYouClient,
  communityId: string
): Promise<HomebaseFile<CommunityMetadata> | null> => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    tagsMatchAtLeastOne: [communityId],
    fileType: [COMMUNITY_METADATA_FILE_TYPE],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  if (!response || !response.searchResults?.length) return null;
  return dsrToCommunityMetadata(dotYouClient, response.searchResults[0], targetDrive, true);
};

// Helpers

export const dsrToCommunityMetadata = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityMetadata> | null> => {
  try {
    const definitionContent = await getContentFromHeaderOrPayload<CommunityMetadata>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!definitionContent) return null;

    const file: HomebaseFile<CommunityMetadata> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: definitionContent,
        },
      },
    };

    return file;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the CommunityMetadata of a dsr', dsr, ex);
    return null;
  }
};
