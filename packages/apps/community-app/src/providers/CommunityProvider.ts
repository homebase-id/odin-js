import {
  deleteFile,
  deleteFilesByGroupId,
  DotYouClient,
  EncryptedKeyHeader,
  FileQueryParams,
  GetBatchQueryResultOptions,
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
import { CommunityDefinition, getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';
import { t } from '@homebase-id/common-app';
import { getRandom16ByteArray, jsonStringify64, toGuidId } from '@homebase-id/js-lib/helpers';
import {
  getContentFromHeaderOrPayloadOverPeer,
  queryBatchOverPeer,
  TransitInstructionSet,
  TransitUploadResult,
  uploadFileOverPeer,
} from '@homebase-id/js-lib/peer';

export const COMMUNITY_CHANNEL_FILE_TYPE = 7015;
export const COMMUNITY_DEFAULT_GENERAL_ID = '7d64f4e4-f8e2-4c3b-bc4b-48bbb86e8f9a';

export const COMMUNITY_GENERAL_CHANNEL: HomebaseFile<CommunityChannel> = {
  fileId: COMMUNITY_DEFAULT_GENERAL_ID, // Just putting something so it fails it ever gets saved; OverwriteFileId during upload has to exist
  fileState: 'active',
  fileSystemType: 'Standard',
  sharedSecretEncryptedKeyHeader: {} as EncryptedKeyHeader,
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
    originalAuthor: '',
    senderOdinId: '',
    versionTag: '',
    payloads: [],
  },
  serverMetadata: {
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected },
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
  odinId: string,
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

  const response =
    odinId && dotYouClient.getHostIdentity() !== odinId
      ? await queryBatchOverPeer(dotYouClient, odinId, params, ro)
      : await queryBatch(dotYouClient, params, ro);
  const serverChannels =
    ((
      await Promise.all(
        response.searchResults.map(async (dsr) => {
          return await dsrToCommunityChannel(
            dotYouClient,
            dsr,
            odinId,
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
  odinId: string,
  communityId: string,
  channelId: string
): Promise<HomebaseFile<CommunityChannel> | undefined> => {
  if (channelId === COMMUNITY_DEFAULT_GENERAL_ID) return COMMUNITY_GENERAL_CHANNEL;

  const targetDrive = getTargetDriveFromCommunityId(communityId);

  if (odinId && odinId !== dotYouClient.getHostIdentity()) {
    throw new Error('Not implemented');
  }
  const dsr = await getFileHeaderByUniqueId(dotYouClient, targetDrive, channelId);

  if (!dsr) return undefined;
  return dsrToCommunityChannel(dotYouClient, dsr, odinId, targetDrive, true);
};

export const saveCommunityChannel = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  channel: NewHomebaseFile<CommunityChannel> | HomebaseFile<CommunityChannel>
) => {
  const communityId = community.fileMetadata.appData.uniqueId as string;
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const uniqueId =
    channel.fileMetadata.appData.uniqueId || toGuidId(channel.fileMetadata.appData.content.title);

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: targetDrive,
    },
  };

  const jsonContent: string = jsonStringify64({
    ...channel.fileMetadata.appData.content,
  });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: channel.fileMetadata.versionTag,
    allowDistribution: true,
    appData: {
      ...channel.fileMetadata.appData,
      uniqueId: uniqueId,
      groupId: communityId,
      fileType: COMMUNITY_CHANNEL_FILE_TYPE,
      content: jsonContent,
    },
    isEncrypted: true,
    accessControlList: community.fileMetadata.appData.content.acl,
  };

  let uploadResult: UploadResult | TransitUploadResult | void;
  if (community.fileMetadata.senderOdinId !== dotYouClient.getHostIdentity()) {
    const transitInstructions: TransitInstructionSet = {
      remoteTargetDrive: targetDrive,
      transferIv: getRandom16ByteArray(),
      recipients: [community.fileMetadata.senderOdinId],
      overwriteGlobalTransitFileId: channel.fileMetadata.globalTransitId,
    };
    uploadResult = await uploadFileOverPeer(
      dotYouClient,
      transitInstructions,
      uploadMetadata,
      undefined,
      undefined,
      undefined
    );
  } else {
    uploadResult = await uploadFile(
      dotYouClient,
      uploadInstructions,
      uploadMetadata,
      undefined,
      undefined,
      undefined
    );
  }

  if (!uploadResult) throw new Error('Upload failed');

  return uniqueId;
};

export const deleteCommunityChannel = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  channel: NewHomebaseFile<CommunityChannel> | HomebaseFile<CommunityChannel>
) => {
  const communityId = community.fileMetadata.appData.uniqueId as string;
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  if (!channel.fileId) throw new Error('Channel has no fileId');

  // Delete the Community channel
  const deleteResult = await deleteFile(
    dotYouClient,
    targetDrive,
    channel.fileId,
    undefined,
    undefined,
    undefined
  );


  // // This only deletes files in the community channel, not threads or anything else
  const deleteCommunityMessageResult = await deleteFilesByGroupId(
    dotYouClient,
    targetDrive,
    [channel.fileId],
    undefined
  );

  if (!deleteResult || !deleteCommunityMessageResult) throw new Error('Delete failed');

}

// Helpers

export const dsrToCommunityChannel = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  odinId: string | undefined,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityChannel> | undefined> => {
  const definitionContent =
    odinId && dotYouClient.getHostIdentity() !== odinId
      ? await getContentFromHeaderOrPayloadOverPeer<CommunityChannel>(
        dotYouClient,
        odinId,
        targetDrive,
        dsr,
        includeMetadataHeader
      )
      : await getContentFromHeaderOrPayload<CommunityChannel>(
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
