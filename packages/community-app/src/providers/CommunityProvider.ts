import {
  DotYouClient,
  EncryptedKeyHeader,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  HomebaseFile,
  PriorityOptions,
  queryBatch,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
} from '@youfoundation/js-lib/core';
import { getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';
import { t } from '@youfoundation/common-app';
import { jsonStringify64, stringGuidsEqual, toGuidId } from '@youfoundation/js-lib/helpers';

export const COMMUNITY_CHANNEL_FILE_TYPE = 7015;
export const COMMUNITY_DEFAULT_GENERAL_ID = '7d64f4e4-f8e2-4c3b-bc4b-48bbb86e8f9a';

export const COMMUNITY_GENERAL_CHANNEL: HomebaseFile<CommunityChannel> = {
  fileId: COMMUNITY_DEFAULT_GENERAL_ID, // Just putting something so it fails it ever gets saved; OverwriteFileId during upload has to exist
  fileState: 'active',
  fileSystemType: 'Standard',
  sharedSecretEncryptedKeyHeader: {} as EncryptedKeyHeader,
  priority: 0,
  fileMetadata: {
    appData: {
      fileType: COMMUNITY_CHANNEL_FILE_TYPE,
      dataType: 0,
      uniqueId: COMMUNITY_DEFAULT_GENERAL_ID,
      content: {
        title: t('general'),
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
    groupId: [communityId],
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

export const getCommunityChannel = async (
  dotYouClient: DotYouClient,
  communityId: string,
  channelId: string
): Promise<HomebaseFile<CommunityChannel> | undefined> => {
  if (channelId === COMMUNITY_DEFAULT_GENERAL_ID) return COMMUNITY_GENERAL_CHANNEL;

  const targetDrive = getTargetDriveFromCommunityId(communityId);

  const dsr = await getFileHeaderByUniqueId(dotYouClient, targetDrive, channelId);

  if (!dsr) return undefined;
  return dsrToCommunityChannel(dotYouClient, dsr, targetDrive, true);
};

export const ensureCommunityChannelsExist = async (
  dotYouClient: DotYouClient,
  communityId: string,
  recipients: string[],
  tags: string[]
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    clientUniqueIdAtLeastOne: tags.map(toGuidId),
    fileType: [COMMUNITY_CHANNEL_FILE_TYPE],
  };

  const ro: GetBatchQueryResultOptions = {
    cursorState: undefined,
    maxRecords: 100,
    includeMetadataHeader: false,
  };

  const response = await queryBatch(dotYouClient, params, ro);
  const missingTags = tags.filter(
    (tag) =>
      !response.searchResults.some((dsr) =>
        stringGuidsEqual(dsr.fileMetadata.appData.uniqueId, toGuidId(tag))
      )
  );

  return await Promise.all(
    missingTags.map((tag) => saveCommunityChannel(dotYouClient, communityId, recipients, tag))
  );
};

const saveCommunityChannel = async (
  dotYouClient: DotYouClient,
  communityId: string,
  recipients: string[],
  tag: string
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const distribute = recipients?.length > 0;
  const uniqueId = toGuidId(tag);

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: targetDrive,
    },
    transitOptions: distribute
      ? {
          recipients: [...recipients],
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.High,
          sendContents: SendContents.All,
        }
      : undefined,
  };

  const jsonContent: string = jsonStringify64({
    title: tag[0].toUpperCase() + tag.slice(1),
    description: '',
  });
  const uploadMetadata: UploadFileMetadata = {
    allowDistribution: distribute,
    appData: {
      uniqueId: uniqueId,
      groupId: communityId,
      fileType: COMMUNITY_CHANNEL_FILE_TYPE,
      content: jsonContent,
    },
    isEncrypted: true,
    accessControlList: {
      requiredSecurityGroup: SecurityGroupType.Connected,
    },
  };

  const uploadResult = await uploadFile(
    dotYouClient,
    uploadInstructions,
    uploadMetadata,
    undefined,
    undefined,
    undefined
  );
  if (!uploadResult) throw new Error('Upload failed');

  return uniqueId;
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
