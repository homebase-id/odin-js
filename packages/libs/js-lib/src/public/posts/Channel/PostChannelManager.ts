const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import { ApiType, DotYouClient } from '../../../core/DotYouClient';
import { DEFAULT_PAYLOAD_KEY, MAX_HEADER_CONTENT_BYTES } from '../../../core/constants';
import {
  getDrivesByType,
  FileQueryParams,
  GetBatchQueryResultOptions,
  queryBatchCollection,
  getContentFromHeaderOrPayload,
  UploadResult,
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  uploadFile,
  deleteFile,
  TargetDrive,
  queryBatch,
  HomebaseFile,
  NewHomebaseFile,
  getSecurityContext,
  ensureDrive,
} from '../../../core/core';
import {
  drivesEqual,
  getRandom16ByteArray,
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
  toGuidId,
  uint8ArrayToBase64,
} from '../../../helpers/helpers';
import { ChannelDefinition, BlogConfig, CollaborativeChannelDefinition } from '../PostTypes';

export const getChannelDefinitions = async (
  dotYouClient: DotYouClient
): Promise<HomebaseFile<ChannelDefinition>[]> => {
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
  ) as HomebaseFile<ChannelDefinition>[];
};

export const getChannelDefinition = async (
  dotYouClient: DotYouClient,
  channelId: string
): Promise<HomebaseFile<ChannelDefinition> | undefined> =>
  await getChannelDefinitionInternal(dotYouClient, channelId);

export const getChannelDefinitionBySlug = async (dotYouClient: DotYouClient, slug: string) => {
  const channels = await getChannelDefinitions(dotYouClient);
  return channels.find((channel) => channel.fileMetadata.appData.content.slug === slug);
};

export const saveChannelDefinition = async (
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<ChannelDefinition>,
  onMissingDrive?: () => void
): Promise<UploadResult | undefined> => {
  const channelContent = definition.fileMetadata.appData.content;

  if (!definition.fileMetadata.appData.uniqueId) {
    definition.fileMetadata.appData.uniqueId = toGuidId(channelContent.name);
  }

  if (stringGuidsEqual(definition.fileMetadata.appData.uniqueId, BlogConfig.PublicChannelId)) {
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
  const existingChannelDef = await getChannelDefinitionInternal(
    dotYouClient,
    definition.fileMetadata.appData.uniqueId
  );
  const fileId = existingChannelDef?.fileId;
  const versionTag = existingChannelDef?.fileMetadata.versionTag;

  if (!fileId) {
    // Channel doesn't exist yet, we need to check if the drive does exist and if there is access:
    const securityContext = await getSecurityContext(dotYouClient);
    if (
      !securityContext?.permissionContext.permissionGroups.some((x) =>
        x.driveGrants.some((driveGrant) =>
          drivesEqual(driveGrant.permissionedDrive.drive, targetDrive)
        )
      )
    ) {
      if (dotYouClient.getType() === ApiType.Owner) {
        await ensureDrive(
          dotYouClient,
          targetDrive,
          channelContent.name,
          channelContent.description,
          true
        );
      } else {
        console.warn(`[odin-js: PostDefinitionProvider] Save Channel: No access to drive`);
        onMissingDrive && onMissingDrive();
        return;
      }
    }
  }

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      drive: targetDrive,
    },
  };

  const payloadJson: string = jsonStringify64({
    ...definition.fileMetadata.appData.content,
    acl: definition.fileMetadata.appData.content.isCollaborative
      ? (definition.fileMetadata.appData.content as CollaborativeChannelDefinition).acl
      : undefined,
  });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;
  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: false,
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
  if (stringGuidsEqual(channelId, BlogConfig.PublicChannelId))
    throw new Error(`Remove Channel: can't remove default channel`);

  const channelData = await getChannelDefinitionInternal(dotYouClient, channelId);
  if (channelData?.fileId) {
    deleteFile(dotYouClient, GetTargetDriveFromChannelId(channelId), channelData.fileId);
    // TODO Should remove the Drive itself as well
  } else {
    throw new Error(`Remove Channel: Channel with id: ${channelId} not found`);
  }
};

export const GetTargetDriveFromChannelId = (channelId: string): TargetDrive => {
  if (!channelId || channelId.toLowerCase().replace(/-/g, '').length !== 32) {
    throw new Error(`GetTargetDriveFromChannelId: Invalid channelId: "${channelId}"`);
  }

  return {
    alias: channelId,
    type: BlogConfig.DriveType,
  };
};

// Internals:
const getChannelDefinitionInternal = async (
  dotYouClient: DotYouClient,
  channelId: string
): Promise<HomebaseFile<ChannelDefinition> | undefined> => {
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
  } catch {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }

  return;
};

export const dsrToChannelFile = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<ChannelDefinition> | undefined> => {
  const definitionContent = await getContentFromHeaderOrPayload<ChannelDefinition>(
    dotYouClient,
    targetDrive,
    dsr,
    includeMetadataHeader
  );
  if (!definitionContent) return undefined;

  const file: HomebaseFile<ChannelDefinition> = {
    ...dsr,
    fileMetadata: {
      ...dsr.fileMetadata,
      appData: {
        ...dsr.fileMetadata.appData,
        uniqueId:
          dsr.fileMetadata.appData.uniqueId ||
          ('channelId' in definitionContent && typeof definitionContent.channelId === 'string'
            ? definitionContent.channelId
            : undefined),
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
