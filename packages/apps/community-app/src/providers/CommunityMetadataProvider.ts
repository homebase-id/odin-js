import {
  DEFAULT_PAYLOAD_KEY,
  OdinClient,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  HomebaseFile,
  MAX_HEADER_CONTENT_BYTES,
  NewHomebaseFile,
  PayloadFile,
  queryBatch,
  RichText,
  SecurityGroupType,
  SystemFileType,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '@homebase-id/js-lib/core';
import {
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';

export interface Draft {
  message: RichText | undefined;
  updatedAt: number;
}

export interface CommunityMetadata {
  lastReadTime: number;
  threadsLastReadTime: number;
  channelLastReadTime: Record<string, number>;
  pinnedChannels: string[];
  savedMessages: { messageId: string; systemFileType: SystemFileType }[];
  notifiationsEnabled?: boolean;

  // Community info
  odinId: string;
  communityId: string;
}

export const LOCAL_COMMUNITY_APP_DRIVE: TargetDrive = {
  alias: '3e5de26f-8fa3-43c1-975a-d0dd2aa8564c',
  type: '93a6e08d-14d9-479e-8d99-bae4e5348a16',
};

export const COMMUNITY_METADATA_FILE_TYPE = 7011;

export const uploadCommunityMetadata = async (
  odinClient: OdinClient,
  definition: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata>,
  onVersionConflicht?: () => Promise<void | UploadResult> | void
): Promise<UploadResult | undefined> => {
  if (!definition.fileMetadata.appData.uniqueId) {
    throw new Error('CommunityMetadata must have a uniqueId');
  }

  if (
    !stringGuidsEqual(
      definition.fileMetadata.appData.uniqueId,
      definition.fileMetadata.appData.content.communityId
    )
  ) {
    throw new Error('CommunityMetadata must have a uniqueId that matches the communityId');
  }

  const instructionSet: UploadInstructionSet = {
    storageOptions: {
      overwriteFileId: definition.fileId,
      drive: LOCAL_COMMUNITY_APP_DRIVE,
    },
  };

  const payloads: PayloadFile[] = [];

  // Remove drafts from the content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (definition.fileMetadata.appData.content as any).drafts;
  const jsonContent: string = jsonStringify64({ ...definition.fileMetadata.appData.content });
  const payloadBytes = stringToUint8Array(
    jsonStringify64({ ...definition.fileMetadata.appData.content })
  );

  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;
  const content = shouldEmbedContent
    ? jsonContent
    : jsonStringify64({
      ...definition.fileMetadata.appData.content,
      drafts: undefined,
    });

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
    });
  }

  const metadata: UploadFileMetadata = {
    versionTag: definition.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      tags: definition.fileMetadata.appData.tags,
      uniqueId: definition.fileMetadata.appData.uniqueId,
      fileType: COMMUNITY_METADATA_FILE_TYPE,
      content: content,
    },
    isEncrypted: true,
    accessControlList: {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  const result = await uploadFile(
    odinClient,
    instructionSet,
    metadata,
    payloads,
    undefined,
    true,
    onVersionConflicht
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

export const getCommunityMetadata = async (
  odinClient: OdinClient,
  communityId: string
): Promise<HomebaseFile<CommunityMetadata> | null> => {
  const header = await getFileHeaderByUniqueId(
    odinClient,
    LOCAL_COMMUNITY_APP_DRIVE,
    communityId
  );

  if (!header) return null;
  return dsrToCommunityMetadata(odinClient, header, LOCAL_COMMUNITY_APP_DRIVE, true);
};

export const getCommunitiesMetadata = async (odinClient: OdinClient) => {
  const response = await queryBatch(
    odinClient,
    {
      targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
      fileType: [COMMUNITY_METADATA_FILE_TYPE],
    },
    {
      maxRecords: 100,
      includeMetadataHeader: true,
    }
  );

  return await Promise.all(
    response.searchResults.map((dsr) =>
      dsrToCommunityMetadata(odinClient, dsr, LOCAL_COMMUNITY_APP_DRIVE, true)
    )
  );
};

// Helpers

export const dsrToCommunityMetadata = async (
  odinClient: OdinClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityMetadata> | null> => {
  try {
    const definitionContent = await getContentFromHeaderOrPayload<Partial<CommunityMetadata>>(
      odinClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!definitionContent) return null;

    const file: HomebaseFile<CommunityMetadata> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: {
            // Default values
            savedMessages: [],
            channelLastReadTime: {},
            pinnedChannels: [],
            lastReadTime: 0,
            threadsLastReadTime: 0,
            communityId: dsr.fileMetadata.appData.uniqueId as string,
            odinId: window.location.host,
            ...definitionContent,
          },
        },
      },
    };

    return file;
  } catch (ex) {
    console.error('[community] failed to get the CommunityMetadata of a dsr', dsr, ex);
    return null;
  }
};
