import {
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import { BlogConfig, ChannelDefinition } from './BlogTypes';
import { DataUtil } from '../../core/DataUtil';
import {
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/DriveUploadTypes';
import {
  DeleteFile,
  EnsureDrive,
  GetDrivesByType,
  GetPayload,
  QueryBatch,
  QueryBatchCollection,
  Random16,
  Upload,
} from '../../core/DriveData/DriveProvider';
import { DotYouClient } from '../../core/DotYouClient';

export const getChannelDefinitions = async (
  dotYouClient: DotYouClient
): Promise<ChannelDefinition[]> => {
  const drives = await GetDrivesByType(dotYouClient, BlogConfig.DriveType, 1, 1000);
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

  const response = await QueryBatchCollection(dotYouClient, queries);
  const definitions = await Promise.all(
    response.results.map(async (response) => {
      if (response.searchResults.length == 1) {
        const channelDrive = getChannelDrive(response.name);
        const dsr = response.searchResults[0];

        const definition = await GetPayload<ChannelDefinition>(
          dotYouClient,
          channelDrive,
          dsr.fileId,
          dsr.fileMetadata,
          dsr.sharedSecretEncryptedKeyHeader,
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
    definition.channelId = DataUtil.toGuidId(definition.name);
  }

  const encrypt = !(
    definition.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    definition.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const targetDrive = GetTargetDriveFromChannelId(definition.channelId);
  await EnsureDrive(dotYouClient, targetDrive, definition.name, channelMetadata, true, true);

  const { fileId } = (await getChannelDefinitionInternal(dotYouClient, definition.channelId)) ?? {
    fileId: undefined,
  };

  const instructionSet: UploadInstructionSet = {
    transferIv: Random16(),
    storageOptions: {
      overwriteFileId: fileId,
      drive: targetDrive,
    },
    transitOptions: null,
  };

  const payloadJson: string = DataUtil.JsonStringify64(definition);
  const payloadBytes = DataUtil.stringToUint8Array(payloadJson);

  // Set max of 3kb for jsonContent so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    allowDistribution: false,
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

  return await Upload(dotYouClient, instructionSet, metadata, payloadBytes, undefined, encrypt);
};

export const removeChannelDefinition = async (dotYouClient: DotYouClient, channelId: string) => {
  if (channelId === BlogConfig.PublicChannel.channelId) {
    throw new Error(`Remove Channel: can't remove default channel`);
  }

  const channelData = await getChannelDefinitionInternal(dotYouClient, channelId);
  if (channelData?.fileId) {
    DeleteFile(dotYouClient, GetTargetDriveFromChannelId(channelId), channelData.fileId);
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
): Promise<{ definition: ChannelDefinition; fileId: string } | undefined> => {
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
    const response = await QueryBatch(dotYouClient, params, ro);

    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      const definition = await GetPayload<ChannelDefinition>(
        dotYouClient,
        targetDrive,
        dsr.fileId,
        dsr.fileMetadata,
        dsr.sharedSecretEncryptedKeyHeader,
        response.includeMetadataHeader
      );

      return {
        fileId: dsr.fileId,
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
