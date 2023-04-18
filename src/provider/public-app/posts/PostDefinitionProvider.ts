import {
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { BlogConfig, ChannelDefinition } from './PostTypes';
import {
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';
import {
  deleteFile,
  ensureDrive,
  getDrivesByType,
  getPayload,
  queryBatch,
  queryBatchCollection,
  uploadFile,
} from '../../core/DriveData/DriveProvider';
import { DotYouClient } from '../../core/DotYouClient';
import { jsonStringify64, stringToUint8Array, toGuidId } from '../../core/helpers/DataUtil';
import { getRandom16ByteArray } from '../../core/DriveData/UploadHelpers';

export const getChannelDefinitions = async (
  dotYouClient: DotYouClient
): Promise<ChannelDefinition[]> => {
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

        const definition = await getPayload<ChannelDefinition>(
          dotYouClient,
          channelDrive,
          dsr,
          response.includeMetadataHeader
        );

        return definition;
      }
    })
  );

  return definitions.filter((channel) => channel !== undefined) as ChannelDefinition[];
};

export const getChannelDefinition = async (
  dotYouClient: DotYouClient,
  channelId: string
): Promise<ChannelDefinition | undefined> => {
  const { definition } = (await getChannelDefinitionInternal(dotYouClient, channelId)) ?? {
    definition: undefined,
  };

  return definition;
};

export const getChannelDefinitionBySlug = async (dotYouClient: DotYouClient, slug: string) => {
  const channels = await getChannelDefinitions(dotYouClient);
  return channels.find((channel) => channel.slug === slug);
};

export const saveChannelDefinition = async (
  dotYouClient: DotYouClient,
  definition: ChannelDefinition
): Promise<UploadResult> => {
  const channelMetadata = '';

  if (!definition.channelId) {
    definition.channelId = toGuidId(definition.name);
  }

  if (definition.channelId === BlogConfig.PublicChannel.channelId) {
    // Always keep the slug for the public channel
    definition.slug = BlogConfig.PublicChannel.slug;
  }

  const encrypt = !(
    definition.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    definition.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const targetDrive = GetTargetDriveFromChannelId(definition.channelId);
  await ensureDrive(dotYouClient, targetDrive, definition.name, channelMetadata, true, true);

  const { fileId, versionTag } = (await getChannelDefinitionInternal(
    dotYouClient,
    definition.channelId
  )) ?? {
    fileId: undefined,
  };

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

  const payloadJson: string = jsonStringify64(definition);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: true,
    contentType: 'application/json',
    appData: {
      tags: [definition.channelId],
      contentIsComplete: shouldEmbedContent,
      fileType: BlogConfig.ChannelDefinitionFileType,
      jsonContent: shouldEmbedContent ? payloadJson : null,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: definition.acl,
  };

  return await uploadFile(dotYouClient, instructionSet, metadata, payloadBytes, undefined, encrypt);
};

export const removeChannelDefinition = async (dotYouClient: DotYouClient, channelId: string) => {
  if (channelId === BlogConfig.PublicChannel.channelId) {
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
): Promise<{ definition: ChannelDefinition; fileId: string; versionTag: string } | undefined> => {
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
      const definition = await getPayload<ChannelDefinition>(
        dotYouClient,
        targetDrive,
        dsr,
        response.includeMetadataHeader
      );

      return {
        fileId: dsr.fileId,
        versionTag: dsr.fileMetadata.versionTag,
        definition: definition,
      };
    }
  } catch (ex) {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }

  return;
};

export const getChannelDrive = (channelId: string): TargetDrive => {
  return {
    alias: channelId,
    type: BlogConfig.DriveType,
  };
};
