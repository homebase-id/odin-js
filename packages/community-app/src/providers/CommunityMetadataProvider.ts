import {
  DotYouClient,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  HomebaseFile,
  NewHomebaseFile,
  queryBatch,
  SecurityGroupType,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '@homebase-id/js-lib/core';
import { jsonStringify64, stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export interface CommunityMetadata {
  lastReadTime: number;
  channelLastReadTime: Record<string, number>;
  pinnedChannels: string[];
  odinId: string;
  communityId: string;
}

export const LOCAL_COMMUNITY_APP_DRIVE: TargetDrive = {
  alias: '3e5de26f-8fa3-43c1-975a-d0dd2aa8564c',
  type: '93a6e08d-14d9-479e-8d99-bae4e5348a16',
};

export const COMMUNITY_METADATA_FILE_TYPE = 7011;

export const uploadCommunityMetadata = async (
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata>,
  onVersionConflicht?: () => Promise<void | UploadResult> | void
): Promise<UploadResult | undefined> => {
  if (!definition.fileMetadata.appData.uniqueId) {
    throw new Error('CommunityMetadata must have a uniqueId');
  }

  if (
    !stringGuidsEqual(
      definition.fileMetadata.appData.uniqueId,
      definition.fileMetadata.appData.content.communityId
    )
  ) {
    throw new Error('CommunityMetadata must have a uniqueId that matches the communityId');
  }

  const instructionSet: UploadInstructionSet = {
    storageOptions: {
      overwriteFileId: definition.fileId,
      drive: LOCAL_COMMUNITY_APP_DRIVE,
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
  const header = await getFileHeaderByUniqueId(
    dotYouClient,
    LOCAL_COMMUNITY_APP_DRIVE,
    communityId
  );

  if (!header) return null;
  return dsrToCommunityMetadata(dotYouClient, header, LOCAL_COMMUNITY_APP_DRIVE, true);
};

export const getCommunitiesMetadata = async (dotYouClient: DotYouClient) => {
  const response = await queryBatch(
    dotYouClient,
    {
      targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
      fileType: [COMMUNITY_METADATA_FILE_TYPE],
    },
    {
      maxRecords: 100,
      includeMetadataHeader: true,
    }
  );

  return await Promise.all(
    response.searchResults.map((dsr) =>
      dsrToCommunityMetadata(dotYouClient, dsr, LOCAL_COMMUNITY_APP_DRIVE, true)
    )
  );
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
    console.error('[community] failed to get the CommunityMetadata of a dsr', dsr, ex);
    return null;
  }
};
