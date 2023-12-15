import { OdinBlob } from '../../core/OdinBlob';
import { DotYouClient } from '../../core/DotYouClient';
import { DEFAULT_PAYLOAD_KEY } from '../../core/DriveData/Upload/UploadHelpers';
import {
  getDrivesByType,
  FileQueryParams,
  GetBatchQueryResultOptions,
  queryBatchCollection,
  getContentFromHeaderOrPayload,
  UploadResult,
  SecurityGroupType,
  ensureDrive,
  UploadInstructionSet,
  ScheduleOptions,
  SendContents,
  UploadFileMetadata,
  uploadFile,
  deleteFile,
  TargetDrive,
  queryBatch,
  DriveSearchResult,
  NewDriveSearchResult,
} from '../../core/core';
import {
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
  toGuidId,
} from '../../helpers/helpers';
import { ChannelDefinition, BlogConfig } from './PostTypes';

export const getChannelDefinitions = async (
  dotYouClient: DotYouClient
): Promise<DriveSearchResult<ChannelDefinition>[]> => {
  const drives = await getDrivesByType(dotYouClient, BlogConfig.DriveType, 1, 1000);
  const channelHeaders = drives.results.map((drive) => {
    return {
      id: drive.targetDriveInfo.alias,
      name: drive.name,
    };
  });

  const queries = channelHeaders.map((header) => {
    const channelId = header.id;
    const targetDrive = GetTargetDriveFromChannelId(channelId);

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: [channelId],
      fileType: [BlogConfig.ChannelDefinitionFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      cursorState: undefined,
      maxRecords: 1,
      includeMetadataHeader: true,
    };

    return {
      name: channelId,
      queryParams: params,
      resultOptions: ro,
    };
  });

  const response = await queryBatchCollection(dotYouClient, queries);
  const definitions = await Promise.all(
    response.results.map(async (response) => {
      if (response.searchResults.length == 1) {
        const channelDrive = getChannelDrive(response.name);
        const dsr = response.searchResults[0];

        return dsrToChannelFile(dotYouClient, dsr, channelDrive, response.includeMetadataHeader);
      }
    })
  );

  return definitions.filter(
    (channel) => channel !== undefined
  ) as DriveSearchResult<ChannelDefinition>[];
};

export const getChannelDefinition = async (
  dotYouClient: DotYouClient,
  channelId: string
): Promise<DriveSearchResult<ChannelDefinition> | undefined> =>
  await getChannelDefinitionInternal(dotYouClient, channelId);

export const getChannelDefinitionBySlug = async (dotYouClient: DotYouClient, slug: string) => {
  const channels = await getChannelDefinitions(dotYouClient);
  return channels.find((channel) => channel.fileMetadata.appData.content.slug === slug);
};

export const saveChannelDefinition = async (
  dotYouClient: DotYouClient,
  definition: NewDriveSearchResult<ChannelDefinition>
): Promise<UploadResult> => {
  const channelMetadata = '';
  const channelContent = definition.fileMetadata.appData.content;

  if (!definition.fileMetadata.appData.uniqueId) {
    definition.fileMetadata.appData.uniqueId = toGuidId(channelContent.name);
  }

  if (definition.fileMetadata.appData.uniqueId === BlogConfig.PublicChannelId) {
    // Always keep the slug for the public channel
    definition.fileMetadata.appData.content.slug = BlogConfig.PublicChannelSlug;
  }

  const encrypt = !(
    definition.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Anonymous ||
    definition.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

  const targetDrive = GetTargetDriveFromChannelId(definition.fileMetadata.appData.uniqueId);
  await ensureDrive(dotYouClient, targetDrive, channelContent.name, channelMetadata, true, true);

  const existingChannelDef = await getChannelDefinitionInternal(
    dotYouClient,
    definition.fileMetadata.appData.uniqueId
  );
  const fileId = existingChannelDef?.fileId;
  const versionTag = existingChannelDef?.fileMetadata.versionTag;

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: fileId,
      drive: targetDrive,
    },
    transitOptions: {
      useGlobalTransitId: true,
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      sendContents: SendContents.All,
    },
  };

  const payloadJson: string = jsonStringify64({
    ...definition.fileMetadata.appData.content,
    acl: undefined,
  });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: true,
    appData: {
      uniqueId: definition.fileMetadata.appData.uniqueId,
      tags: [definition.fileMetadata.appData.uniqueId],
      fileType: BlogConfig.ChannelDefinitionFileType,
      content: shouldEmbedContent ? payloadJson : undefined,
    },
    isEncrypted: encrypt,
    accessControlList: definition.serverMetadata?.accessControlList,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    shouldEmbedContent
      ? undefined
      : [
          {
            payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
            key: DEFAULT_PAYLOAD_KEY,
          },
        ],
    undefined,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

export const removeChannelDefinition = async (dotYouClient: DotYouClient, channelId: string) => {
  if (channelId === BlogConfig.PublicChannelId) {
    throw new Error(`Remove Channel: can't remove default channel`);
  }

  const channelData = await getChannelDefinitionInternal(dotYouClient, channelId);
  if (channelData?.fileId) {
    deleteFile(dotYouClient, GetTargetDriveFromChannelId(channelId), channelData.fileId);
    // TODO Should remove the Drive itself as well
  } else {
    throw new Error(`Remove Channel: Channel with id: ${channelId} not found`);
  }
};

export const GetTargetDriveFromChannelId = (channelId: string): TargetDrive => {
  return {
    alias: channelId,
    type: BlogConfig.DriveType,
  };
};

// Internals:
const getChannelDefinitionInternal = async (
  dotYouClient: DotYouClient,
  channelId: string
): Promise<DriveSearchResult<ChannelDefinition> | undefined> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    tagsMatchAtLeastOne: [channelId],
    fileType: [BlogConfig.ChannelDefinitionFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    cursorState: undefined,
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  try {
    const response = await queryBatch(dotYouClient, params, ro);

    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      return dsrToChannelFile(dotYouClient, dsr, targetDrive, response.includeMetadataHeader);
    }
  } catch (ex) {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }

  return;
};

export const dsrToChannelFile = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<DriveSearchResult<ChannelDefinition> | undefined> => {
  const definitionContent = await getContentFromHeaderOrPayload<ChannelDefinition>(
    dotYouClient,
    targetDrive,
    dsr,
    includeMetadataHeader
  );
  if (!definitionContent) return undefined;

  const file: DriveSearchResult<ChannelDefinition> = {
    ...dsr,
    fileMetadata: {
      ...dsr.fileMetadata,
      appData: {
        ...dsr.fileMetadata.appData,
        uniqueId: dsr.fileMetadata.appData.uniqueId || (definitionContent as any).channelId,
        content: definitionContent,
      },
    },
  };

  return file;
};

export const getChannelDrive = (channelId: string): TargetDrive => {
  return {
    alias: channelId,
    type: BlogConfig.DriveType,
  };
};
