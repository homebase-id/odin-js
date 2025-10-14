const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import {
  AccessControlList,
  ApiType,
  DEFAULT_PAYLOAD_KEY,
  deleteFile,
  DotYouClient,
  EmbeddedThumb,
  ensureDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  getContentFromHeaderOrPayload,
  getDrivesByType,
  getSecurityContext,
  HomebaseFile,
  KeyHeader,
  MAX_HEADER_CONTENT_BYTES,
  NewHomebaseFile,
  NewPayloadDescriptor,
  patchFile,
  PayloadFile,
  queryBatch,
  queryBatchCollection,
  SecurityGroupType,
  TargetDrive,
  ThumbnailFile,
  UpdateInstructionSet,
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
  makeGrid,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import { createThumbnails } from '@homebase-id/js-lib/media';
import {
  getContentFromHeaderOrPayloadOverPeer,
  getDrivesByTypeOverPeer,
  queryBatchOverPeer,
} from '@homebase-id/js-lib/peer';
import { getChannelDefinition } from '@homebase-id/js-lib/public';

export interface CommunityDefinition {
  title: string;
  members: string[];
  acl: AccessControlList;
}

export const COMMUNITY_DRIVE_TYPE = '63db75f1-e999-40b2-a321-41ebffa5e363';
export const COMMUNITY_FILE_TYPE = 7010;
export const COMMUNITY_DEF_PROFILE_KEY = 'com_prfl';

export const getCommunities = async (dotYouClient: DotYouClient) => {
  const drives = await getDrivesByType(dotYouClient, COMMUNITY_DRIVE_TYPE, 1, 1000);
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

export const getCommunitiesOverPeer = async (dotYouClient: DotYouClient, odinId: string) => {
  const drives = await getDrivesByTypeOverPeer(dotYouClient, COMMUNITY_DRIVE_TYPE, 1, 1000, odinId);
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
          const definition = await getCommunityOverPeer(dotYouClient, odinId, header.id);
          return definition;
        })
      )
    ).filter(Boolean) as HomebaseFile<CommunityDefinition>[];
  })();
};

export const getCommunityOverPeer = async (
  dotYouClient: DotYouClient,
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

  const response = await queryBatchOverPeer(dotYouClient, odinId, queryParams, ro);

  try {
    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      const definitionContent = await getContentFromHeaderOrPayloadOverPeer<CommunityDefinition>(
        dotYouClient,
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
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<CommunityDefinition>,
  onMissingDrive?: () => void,
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
    definition.fileMetadata.senderOdinId || dotYouClient.getHostIdentity(),
    definition.fileMetadata.appData.uniqueId
  );
  const fileId = existingCommunityDefinition?.fileId;
  const versionTag = existingCommunityDefinition?.fileMetadata.versionTag;

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
      overwriteFileId: fileId,
    },
  };
  const files = definition.fileMetadata.payloads
  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];
  const payloadJson: string = jsonStringify64(definition.fileMetadata.appData.content);
  const payloadBytes = stringToUint8Array(payloadJson);

  for (let i = 0; files && i < files?.length; i++) {
    const payloadKey = `${COMMUNITY_DEF_PROFILE_KEY}${i}`;
    const newMediaFile = files[i];

    if (!newMediaFile.pendingFile) continue;

    if (newMediaFile.contentType?.startsWith('image/')) {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.pendingFile,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.pendingFile,
        previewThumbnail: tinyThumb,
        descriptorContent: newMediaFile.descriptorContent
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    }
  }

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
    });
  }

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

  metadata.appData.previewThumbnail =
    previewThumbnails.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

export const updateCommunity = async (
  dotYouClient: DotYouClient,
  definition: HomebaseFile<CommunityDefinition>,
  imagePayload?: NewPayloadDescriptor[],
  keyHeader?: KeyHeader,

) => {
  if (!definition.fileId) throw new Error('File id is not set');
  const targetDrive = getTargetDriveFromCommunityId(
    definition.fileMetadata.appData.uniqueId as string
  );
  const odinId = definition.fileMetadata.senderOdinId;
  const payloadJson: string = jsonStringify64(definition.fileMetadata.appData.content);
  const payloadBytes = stringToUint8Array(payloadJson);
  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;

  const encryptedKeyHeader = definition.sharedSecretEncryptedKeyHeader;

  const instructionSet: UpdateInstructionSet =
    odinId && odinId !== dotYouClient.getHostIdentity()
      ? {
        transferIv: getRandom16ByteArray(),
        locale: 'peer',
        file: {
          globalTransitId: definition.fileMetadata.globalTransitId as string,
          targetDrive,
        },
        versionTag: definition.fileMetadata.versionTag,
        recipients: [odinId],
        systemFileType: definition.fileSystemType,
      }
      : {
        transferIv: getRandom16ByteArray(),
        locale: 'local',
        file: {
          fileId: definition.fileId,
          targetDrive,
        },
        versionTag: definition.fileMetadata.versionTag,
        systemFileType: definition.fileSystemType,
      };

  const versionTag = definition?.fileMetadata.versionTag;




  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];
  for (let i = 0; imagePayload && i < imagePayload?.length; i++) {
    const payloadKey = `${COMMUNITY_DEF_PROFILE_KEY}${i}`;
    const newMediaFile = imagePayload[i];

    if (!newMediaFile.pendingFile) continue;

    if (newMediaFile.contentType?.startsWith('image/')) {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.pendingFile,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.pendingFile,
        previewThumbnail: tinyThumb,
        descriptorContent: newMediaFile.descriptorContent
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    }
  }

  const uploadMetadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: definition.fileMetadata.appData.uniqueId,
      tags: [definition.fileMetadata.appData.uniqueId as string],
      fileType: COMMUNITY_FILE_TYPE,
      content: shouldEmbedContent ? payloadJson : undefined,
      previewThumbnail:
        previewThumbnails.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0],
    },
    isEncrypted: true,
    accessControlList:
      definition.fileMetadata.appData.content.acl || definition.serverMetadata?.accessControlList,
  };

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
      iv: getRandom16ByteArray(),
    });
  }

  const updateResult = await patchFile(
    dotYouClient,
    encryptedKeyHeader,
    instructionSet,
    uploadMetadata,
    payloads,
    thumbnails,
    undefined,
    async () => {
      console.warn(
        `[CommunityDefinitionProvider] Update Community: Version tag mismatch, fetching latest version...`
      );
      const existingChannel = await getChannelDefinition(
        dotYouClient,
        definition.fileMetadata.appData.uniqueId as string,
      );
      if (!existingChannel) return;
      definition.fileMetadata.versionTag = existingChannel.fileMetadata.versionTag;
      return await updateCommunity(dotYouClient, definition, imagePayload, keyHeader);
    }
  );

  return updateResult;


}

export const getCommunityDefinition = async (
  dotYouClient: DotYouClient,
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
      odinId && odinId !== dotYouClient.getHostIdentity()
        ? await queryBatchOverPeer(dotYouClient, odinId, params, ro)
        : await queryBatch(dotYouClient, params, ro);

    if (response.searchResults.length == 1) {
      const dsr = response.searchResults[0];
      return dsrToCommunity(dotYouClient, dsr, targetDrive, response.includeMetadataHeader);
    }
  } catch (ex) {
    console.debug(`[CommunityDefinitionProvider] getCommunityDefinition: ${ex}`);
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
  const definitionContent =
    dsr.fileMetadata.senderOdinId !== dotYouClient.getHostIdentity()
      ? await getContentFromHeaderOrPayloadOverPeer<CommunityDefinition>(
        dotYouClient,
        dsr.fileMetadata.senderOdinId,
        targetDrive,
        dsr,
        includeMetadataHeader
      )
      : await getContentFromHeaderOrPayload<CommunityDefinition>(
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
