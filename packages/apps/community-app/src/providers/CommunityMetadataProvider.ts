import {
  DEFAULT_PAYLOAD_KEY,
  DotYouClient,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  HomebaseFile,
  MAX_HEADER_CONTENT_BYTES,
  NewHomebaseFile,
  patchFile,
  PayloadFile,
  queryBatch,
  RichText,
  SecurityGroupType,
  SystemFileType,
  TargetDrive,
  UpdateLocalInstructionSet,
  UpdateResult,
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
  dotYouClient: DotYouClient,
  definition: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata>,
  onVersionConflict?: () => Promise<void | UploadResult | UpdateResult> | void
): Promise<UploadResult | UpdateResult | undefined> => {
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

  if (definition.fileId) {
    const existingDefinition = definition as HomebaseFile<CommunityMetadata, string>;
    const encryptedKeyHeader = existingDefinition.sharedSecretEncryptedKeyHeader;

    const patchInstructions: UpdateLocalInstructionSet = {
      file: {
        fileId: existingDefinition.fileId,
        targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
      },
      versionTag: existingDefinition.fileMetadata.versionTag,
      locale: 'local'
    }

    const patchResult = await patchFile(dotYouClient,
      encryptedKeyHeader,
      patchInstructions,
      metadata,
      payloads,
      undefined,
      undefined,
      onVersionConflict as () => Promise<void | UpdateResult>,);

    if (!patchResult) throw new Error(`Patch update failed`);
    return patchResult;
  }

  const instructionSet: UploadInstructionSet = {
    storageOptions: {
      drive: LOCAL_COMMUNITY_APP_DRIVE,
      overwriteFileId: definition.fileId,
    },
  };
  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    undefined,
    true,
    onVersionConflict as () => Promise<void | UploadResult>,
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

export const getCommunityMetadata = async (
  dotYouClient: DotYouClient,
  communityId: string
): Promise<HomebaseFile<CommunityMetadata> | null> => {
  const header = await getFileHeaderByUniqueId(
    dotYouClient,
    LOCAL_COMMUNITY_APP_DRIVE,
    communityId
  );

  if (!header) return null;
  return dsrToCommunityMetadata(dotYouClient, header, LOCAL_COMMUNITY_APP_DRIVE, true);
};

export const getCommunitiesMetadata = async (dotYouClient: DotYouClient) => {
  const response = await queryBatch(
    dotYouClient,
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
      dsrToCommunityMetadata(dotYouClient, dsr, LOCAL_COMMUNITY_APP_DRIVE, true)
    )
  );
};

// Helpers

export const dsrToCommunityMetadata = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityMetadata> | null> => {
  try {
    const definitionContent = await getContentFromHeaderOrPayload<Partial<CommunityMetadata>>(
      dotYouClient,
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
