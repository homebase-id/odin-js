import {
  DotYouClient,
  EncryptedKeyHeader,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getContentFromHeaderOrPayload,
  HomebaseFile,
  queryBatch,
  SecurityGroupType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';
import { t } from '@youfoundation/common-app';

export const COMMUNITY_CHANNEL_FILE_TYPE = 7015;
export const COMMUNITY_DEFAULT_GEENRAL_ID = '7d64f4e4-f8e2-4c3b-bc4b-48bbb86e8f9a';

export const COMMUNITY_GENERAL_CHANNEL: HomebaseFile<CommunityChannel> = {
  fileId: COMMUNITY_DEFAULT_GEENRAL_ID, // Just putting something so it fails it ever gets saved; OverwriteFileId during upload has to exist
  fileState: 'active',
  fileSystemType: 'Standard',
  sharedSecretEncryptedKeyHeader: {} as EncryptedKeyHeader,
  priority: 0,
  fileMetadata: {
    appData: {
      fileType: COMMUNITY_CHANNEL_FILE_TYPE,
      dataType: 0,
      uniqueId: COMMUNITY_DEFAULT_GEENRAL_ID,
      content: {
        title: t('General'),
        description: t('General community channel'),
      },
    },
    created: 0,
    updated: 0,
    isEncrypted: true,
    senderOdinId: '',
    versionTag: '',
    payloads: [],
  },
  serverMetadata: {
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
    allowDistribution: false,
    doNotIndex: false,
  },
};

export interface CommunityChannel {
  title: string;
  description: string;
}

export const getCommunityChannels = async (
  dotYouClient: DotYouClient,
  communityId: string,
  pageSize = 100
): Promise<HomebaseFile<CommunityChannel>[]> => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    tagsMatchAtLeastOne: [communityId],
    fileType: [COMMUNITY_CHANNEL_FILE_TYPE],
  };

  const ro: GetBatchQueryResultOptions = {
    cursorState: undefined,
    maxRecords: pageSize,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);
  const serverChannels =
    ((
      await Promise.all(
        response.searchResults.map(async (dsr) => {
          return await dsrToCommunityChannel(
            dotYouClient,
            dsr,
            targetDrive,
            response.includeMetadataHeader
          );
        })
      )
    ).filter(Boolean) as HomebaseFile<CommunityChannel>[]) || [];

  return [COMMUNITY_GENERAL_CHANNEL, ...serverChannels];
};

// Helpers

const dsrToCommunityChannel = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityChannel> | undefined> => {
  const definitionContent = await getContentFromHeaderOrPayload<CommunityChannel>(
    dotYouClient,
    targetDrive,
    dsr,
    includeMetadataHeader
  );
  if (!definitionContent) return undefined;

  const file: HomebaseFile<CommunityChannel> = {
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
};
