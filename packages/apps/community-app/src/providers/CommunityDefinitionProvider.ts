const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import {
  AccessControlList,
  ApiType,
  DEFAULT_PAYLOAD_KEY,
  deleteFile,
  OdinClient,
  ensureDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getContentFromHeaderOrPayload,
  getDrivesByType,
  getSecurityContext,
  HomebaseFile,
  MAX_HEADER_CONTENT_BYTES,
  NewHomebaseFile,
  queryBatch,
  queryBatchCollection,
  SecurityGroupType,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '@homebase-id/js-lib/core';
import {
  drivesEqual,
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import {
  getContentFromHeaderOrPayloadOverPeer,
  getDrivesByTypeOverPeer,
  queryBatchOverPeer,
} from '@homebase-id/js-lib/peer';

export interface CommunityDefinition {
  title: string;
  members: string[];
  acl: AccessControlList;
}

export const COMMUNITY_DRIVE_TYPE = '63db75f1-e999-40b2-a321-41ebffa5e363';
export const COMMUNITY_FILE_TYPE = 7010;

export const getCommunities = async (odinClient: OdinClient) => {
  const drives = await getDrivesByType(odinClient, COMMUNITY_DRIVE_TYPE, 1, 1000);
  const communityHeaders = drives.results.map((drive) => {
    return {
      id: drive.targetDriveInfo.alias,
      name: drive.name,
    };
  });

  const queries = communityHeaders.map((community) => {
    const communityId = community.id;
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

    return {
      name: communityId,
      queryParams: params,
      resultOptions: ro,
    };
  });

  const response = await queryBatchCollection(odinClient, queries);
  const definitions = await Promise.all(
    response.results.map(async (response) => {
      if (response.searchResults.length == 1) {
        const communityDrive = getTargetDriveFromCommunityId(response.name);
        const dsr = response.searchResults[0];

        return dsrToCommunity(odinClient, dsr, communityDrive, response.includeMetadataHeader);
      }
    })
  );

  return definitions.filter(
    (channel) => channel !== undefined
  ) as HomebaseFile<CommunityDefinition>[];
};

export const getCommunitiesOverPeer = async (odinClient: OdinClient, odinId: string) => {
  const drives = await getDrivesByTypeOverPeer(odinClient, COMMUNITY_DRIVE_TYPE, 1, 1000, odinId);
  const communityHeaders = drives.results.map((drive) => {
    return {
      id: drive.targetDriveInfo.alias,
      name: drive.name,
    };
  });

  return (async () => {
    return (
      await Promise.all(
        communityHeaders.map(async (header) => {
          const definition = await getCommunityOverPeer(odinClient, odinId, header.id);
          return definition;
        })
      )
    ).filter(Boolean) as HomebaseFile<CommunityDefinition>[];
  })();
};

export const getCommunityOverPeer = async (
  odinClient: OdinClient,
  odinId: string,
  communityId: string
): Promise<HomebaseFile<CommunityDefinition> | null> => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);

  const queryParams: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [COMMUNITY_FILE_TYPE],
  };

  const ro: GetBatchQueryResultOptions = {
    cursorState: undefined,
    maxRecords: 1,
    includeMetadataHeader: true,
  };

  const response = await queryBatchOverPeer(odinClient, odinId, queryParams, ro);

  try {
    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      const definitionContent = await getContentFromHeaderOrPayloadOverPeer<CommunityDefinition>(
        odinClient,
        odinId,
        targetDrive,
        dsr,
        response.includeMetadataHeader
      );

      if (!definitionContent) return null;

      const file: HomebaseFile<CommunityDefinition> = {
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
    }
  } catch {
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }
  return null;
};

export const saveCommunity = async (
  odinClient: OdinClient,
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
    odinClient,
    definition.fileMetadata.senderOdinId || odinClient.getHostIdentity(),
    definition.fileMetadata.appData.uniqueId
  );
  const fileId = existingCommunityDefinition?.fileId;
  const versionTag = existingCommunityDefinition?.fileMetadata.versionTag;

  if (!fileId) {
    // Channel doesn't exist yet, we need to check if the drive does exist and if there is access:
    const securityContext = await getSecurityContext(odinClient);
    if (
      !securityContext?.permissionContext.permissionGroups.some((x) =>
        x.driveGrants.some((driveGrant) =>
          drivesEqual(driveGrant.permissionedDrive.drive, targetDrive)
        )
      )
    ) {
      if (odinClient.getType() === ApiType.Owner) {
        await ensureDrive(
          odinClient,
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
      drive: targetDrive,
    },
  };

  const payloadJson: string = jsonStringify64(definition.fileMetadata.appData.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;
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
    accessControlList:
      definition.fileMetadata.appData.content.acl || definition.serverMetadata?.accessControlList,
  };

  const result = await uploadFile(
    odinClient,
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
  odinClient: OdinClient,
  odinId: string,
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
    const response =
      odinId && odinId !== odinClient.getHostIdentity()
        ? await queryBatchOverPeer(odinClient, odinId, params, ro)
        : await queryBatch(odinClient, params, ro);

    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      return dsrToCommunity(odinClient, dsr, targetDrive, response.includeMetadataHeader);
    }
  } catch (ex) {
    console.debug(`[CommunityDefinitionProvider] getCommunityDefinition: ${ex}`);
    // Catch al, as targetDrive might be inaccesible (when it doesn't exist yet)
  }

  return;
};

export const removeCommunityDefinition = async (
  odinClient: OdinClient,
  community: HomebaseFile<CommunityDefinition>
) => {
  if (!community.fileMetadata.appData.uniqueId) throw new Error('Community unique id is not set');
  return await deleteFile(
    odinClient,
    getTargetDriveFromCommunityId(community.fileMetadata.appData.uniqueId as string),
    community.fileId
  );
};

// Helpers

export const dsrToCommunity = async (
  odinClient: OdinClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityDefinition> | undefined> => {
  const definitionContent =
    dsr.fileMetadata.senderOdinId !== odinClient.getHostIdentity()
      ? await getContentFromHeaderOrPayloadOverPeer<CommunityDefinition>(
        odinClient,
        dsr.fileMetadata.senderOdinId,
        targetDrive,
        dsr,
        includeMetadataHeader
      )
      : await getContentFromHeaderOrPayload<CommunityDefinition>(
        odinClient,
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
