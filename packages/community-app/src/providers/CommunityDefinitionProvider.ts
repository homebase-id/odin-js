const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import {
  ApiType,
  DEFAULT_PAYLOAD_KEY,
  deleteFile,
  DotYouClient,
  ensureDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getContentFromHeaderOrPayload,
  getDrivesByType,
  getSecurityContext,
  HomebaseFile,
  NewHomebaseFile,
  queryBatch,
  queryBatchCollection,
  SecurityGroupType,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '@youfoundation/js-lib/core';
import {
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
} from '@youfoundation/js-lib/helpers';

export interface CommunityDefinition {
  title: string;
  recipients: string[];
}

export const COMMUNITY_DRIVE_TYPE = '63db75f1-e999-40b2-a321-41ebffa5e363';
export const COMMUNITY_FILE_TYPE = 7010;

export const getCommunities = async (dotYouClient: DotYouClient) => {
  const drives = await getDrivesByType(dotYouClient, COMMUNITY_DRIVE_TYPE, 1, 1000);
  const channelHeaders = drives.results.map((drive) => {
    return {
      id: drive.targetDriveInfo.alias,
      name: drive.name,
    };
  });

  const queries = channelHeaders.map((header) => {
    const channelId = header.id;
    const targetDrive = getTargetDriveFromCommunityId(channelId);

    const params: FileQueryParams = {
      targetDrive: targetDrive,
      tagsMatchAtLeastOne: [channelId],
      fileType: [COMMUNITY_FILE_TYPE],
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
        const communityDrive = getTargetDriveFromCommunityId(response.name);
        const dsr = response.searchResults[0];

        return dsrToCommunity(dotYouClient, dsr, communityDrive, response.includeMetadataHeader);
      }
    })
  );

  return definitions.filter(
    (channel) => channel !== undefined
  ) as HomebaseFile<CommunityDefinition>[];
};

export const saveCommunity = async (
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<CommunityDefinition>,
  onMissingDrive?: () => void
): Promise<UploadResult | undefined> => {
  const communityContent = definition.fileMetadata.appData.content;

  if (!definition.fileMetadata.appData.uniqueId) {
    definition.fileMetadata.appData.uniqueId = getNewId();
  }

  const encrypt = !(
    definition.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Anonymous ||
    definition.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

  const targetDrive = getTargetDriveFromCommunityId(definition.fileMetadata.appData.uniqueId);
  const existingCommunityDefinition = await getCommunityDefinition(
    dotYouClient,
    definition.fileMetadata.appData.uniqueId
  );
  const fileId = existingCommunityDefinition?.fileId;
  const versionTag = existingCommunityDefinition?.fileMetadata.versionTag;

  if (!fileId) {
    // Channel doesn't exist yet, we need to check if the drive does exist and if there is access:
    const securityContext = await getSecurityContext(dotYouClient);
    if (
      !securityContext?.permissionContext.permissionGroups.some((x) =>
        x.driveGrants.some(
          (driveGrant) =>
            stringGuidsEqual(driveGrant.permissionedDrive.drive.alias, targetDrive.alias) &&
            stringGuidsEqual(driveGrant.permissionedDrive.drive.type, targetDrive.type)
        )
      )
    ) {
      if (dotYouClient.getType() === ApiType.Owner) {
        await ensureDrive(
          dotYouClient,
          targetDrive,
          communityContent.title,
          `Drive for community ${communityContent.title}`,
          true
        );
      } else {
        console.warn(`[CommunityDefintionProvider] Save Community: No access to drive`);
        onMissingDrive && onMissingDrive();
        return;
      }
    }
  }

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: fileId,
      drive: targetDrive,
    },
  };

  const payloadJson: string = jsonStringify64(definition.fileMetadata.appData.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: definition.fileMetadata.appData.uniqueId,
      tags: [definition.fileMetadata.appData.uniqueId],
      fileType: COMMUNITY_FILE_TYPE,
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

export const getCommunityDefinition = async (
  dotYouClient: DotYouClient,
  communityId: string
): Promise<HomebaseFile<CommunityDefinition> | undefined> => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    tagsMatchAtLeastOne: [communityId],
    fileType: [COMMUNITY_FILE_TYPE],
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
      return dsrToCommunity(dotYouClient, dsr, targetDrive, response.includeMetadataHeader);
    }
  } catch (ex) {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }

  return;
};

export const removeCommunityDefinition = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>
) => {
  if (!community.fileMetadata.appData.uniqueId) throw new Error('Community unique id is not set');
  return await deleteFile(
    dotYouClient,
    getTargetDriveFromCommunityId(community.fileMetadata.appData.uniqueId as string),
    community.fileId
  );
};

// Helpers

export const dsrToCommunity = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityDefinition> | undefined> => {
  const definitionContent = await getContentFromHeaderOrPayload<CommunityDefinition>(
    dotYouClient,
    targetDrive,
    dsr,
    includeMetadataHeader
  );
  if (!definitionContent) return undefined;

  const file: HomebaseFile<CommunityDefinition> = {
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

export const getTargetDriveFromCommunityId = (communityId: string): TargetDrive => {
  return {
    alias: communityId,
    type: COMMUNITY_DRIVE_TYPE,
  };
};
