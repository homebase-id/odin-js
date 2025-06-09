import {
  DotYouClient,
  HomebaseFile,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewHomebaseFile,
  SecurityGroupType,
  TargetDrive,
  UploadFileMetadata,
  UploadInstructionSet,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  queryBatch,
  uploadFile,
  EncryptedKeyHeader,
  getLocalContentFromHeader,
  UpdateLocalInstructionSet,
  patchFile,
  UpdateResult,
  PayloadFile,
  ThumbnailFile,
} from '@homebase-id/js-lib/core';
import { jsonStringify64 } from '@homebase-id/js-lib/helpers';
import { createThumbnails } from '@homebase-id/js-lib/media';

export const CHAT_CONVERSATION_FILE_TYPE = 8888;
export const CHAT_CONVERSATION_LOCAL_METADATA_FILE_TYPE = 8889;
export const ConversationWithYourselfId = 'e4ef2382-ab3c-405d-a8b5-ad3e09e980dd';
export const CONVERSATION_PAYLOAD_KEY = 'convo_pk';
export const CONVERSATION_IMAGE_KEY = 'convo_img';

export const ConversationWithYourself: HomebaseFile<UnifiedConversation, ConversationMetadata> = {
  fileState: 'active',
  fileId: '',
  fileSystemType: 'Standard',
  fileMetadata: {
    created: 0,
    updated: 0,
    isEncrypted: false,
    senderOdinId: '',
    originalAuthor: '',
    appData: {
      uniqueId: ConversationWithYourselfId,
      fileType: CHAT_CONVERSATION_FILE_TYPE,
      dataType: 0,
      content: {
        title: 'You',
        recipients: [],
      },
    },
    versionTag: '',
    payloads: [],
  },
  serverMetadata: undefined,
  sharedSecretEncryptedKeyHeader: {} as EncryptedKeyHeader,
};

export const ChatDrive: TargetDrive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

interface BaseConversation {
  title: string;
}

export interface UnifiedConversation extends BaseConversation {
  recipients: string[];
}

/**
 * @deprecated The SingleConversation type is deprecated. Use the UnifiedConversation type instead.
 */
export interface SingleConversation extends BaseConversation {
  recipient: string;
}

/**
 * @deprecated The GroupConversation type is deprecated. Use the UnifiedConversation type instead.
 */
export interface GroupConversation extends BaseConversation {
  recipients: string[];
}

/**
 * @deprecated The SingleConversation & GroupConversation types are deprecated. Use the UnifiedConversation type instead.
 */
export type Conversation = SingleConversation | GroupConversation;

export const getConversations = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined,
  pageSize: number
) => {
  const params: FileQueryParams = {
    targetDrive: ChatDrive,
    fileType: [CHAT_CONVERSATION_FILE_TYPE],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  if (!response) return null;

  return {
    ...response,
    searchResults:
      ((await Promise.all(
        response.searchResults
          .map(async (result) => await dsrToConversation(dotYouClient, result, ChatDrive, true))
          .filter(Boolean)
      )) as HomebaseFile<UnifiedConversation, ConversationMetadata>[]) || [],
  };
};

export const getConversation = async (dotYouClient: DotYouClient, conversationId: string) => {
  if (conversationId === ConversationWithYourselfId) return ConversationWithYourself;

  const conversationHeader = await getFileHeaderByUniqueId<string>(
    dotYouClient,
    ChatDrive,
    conversationId
  );
  if (!conversationHeader) return null;

  return dsrToConversation(dotYouClient, conversationHeader, ChatDrive, true);
};

export const dsrToConversation = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<UnifiedConversation, ConversationMetadata> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<Conversation>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const identity = dotYouClient.getHostIdentity();
    const conversation: HomebaseFile<UnifiedConversation> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: {
            ...attrContent,
            recipients: (attrContent as GroupConversation).recipients
              ? [
                ...(attrContent as GroupConversation).recipients.filter(
                  (recipient) => recipient !== identity
                ),
                identity,
              ]
              : [(attrContent as SingleConversation).recipient, identity],
          },
        },
      },
    };

    const conversationMetadata = await (async () => {
      const localContent = conversation?.fileMetadata.localAppData?.content;
      if (localContent) {
        try {
          const localMetadata = await getLocalContentFromHeader<ConversationMetadata>(
            dotYouClient,
            ChatDrive,
            conversation,
            true
          );

          if (localMetadata) return localMetadata;
        } catch (error) {
          console.warn(
            'Error getting local metadata, falling back to old conversation metadata',
            error
          );
        }
      }

      // TODO: remove at any point after july 2025 (couple months after the deprecation of the local metadata file)
      const serverFile = await getConversationMetadata(
        dotYouClient,
        conversation.fileMetadata.appData.uniqueId as string
      );
      return (
        serverFile?.fileMetadata.appData.content || {
          conversationId: conversation.fileMetadata.appData.uniqueId as string,
          lastReadTime: 0,
        }
      );
    })();

    return {
      ...conversation,
      fileMetadata: {
        ...conversation.fileMetadata,
        localAppData: { ...conversation.fileMetadata.localAppData, content: conversationMetadata },
      },
    };
  } catch (ex) {
    console.error('[chat] failed to get the conversation payload of a dsr', dsr, ex);
    return null;
  }
};

export const uploadConversation = async (
  dotYouClient: DotYouClient,
  conversation:
    | NewHomebaseFile<UnifiedConversation, ConversationMetadata>
    | HomebaseFile<UnifiedConversation, ConversationMetadata>,
  imagePayload: Blob | null | undefined, // undefined means no change
  onVersionConflict?: () => void
) => {
  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
    },
  };

  const conversationContent = conversation.fileMetadata.appData.content;
  const payloadJson: string = jsonStringify64({ ...conversationContent, version: 1 });

  const payloads: PayloadFile[] | undefined = [];
  const thumbnails: ThumbnailFile[] | undefined = [];
  if (imagePayload) {
    const { additionalThumbnails, tinyThumb } = await createThumbnails(
      imagePayload,
      CONVERSATION_IMAGE_KEY,
      [
        { quality: 80, maxPixelDimension: 75, maxBytes: 8 * 1024 },
        { quality: 80, maxPixelDimension: 300, maxBytes: 50 * 1024 },
      ]
    );

    payloads.push({
      key: CONVERSATION_IMAGE_KEY,
      payload: imagePayload,
    });
    thumbnails.push(...additionalThumbnails);
    conversation.fileMetadata.appData.previewThumbnail = tinyThumb;
  }

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: false, // not yet, only on update is the conversation sent to recipients
    appData: {
      uniqueId: conversation.fileMetadata.appData.uniqueId,
      fileType: conversation.fileMetadata.appData.fileType || CHAT_CONVERSATION_FILE_TYPE,
      content: payloadJson,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  return await uploadFile(
    dotYouClient,
    uploadInstructions,
    uploadMetadata,
    payloads,
    thumbnails,
    true,
    onVersionConflict
  );
};

export const updateConversation = async (
  dotYouClient: DotYouClient,
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>,
  imagePayload: Blob | null | undefined, // undefined means no change
  distribute = false,
  ignoreConflict = false
): Promise<UpdateResult | void> => {
  const identity = dotYouClient.getHostIdentity();

  if (!conversation.fileId) throw new Error('Message does not have a fileId');
  const recipients = conversation.fileMetadata.appData.content.recipients.filter(
    (recipient) => recipient !== identity
  );

  const uploadInstructions: UpdateLocalInstructionSet = {
    file: {
      fileId: conversation.fileId,
      targetDrive: ChatDrive,
    },
    recipients: distribute ? recipients : undefined,

    versionTag: conversation.fileMetadata.versionTag,
    locale: 'local',
  };

  const conversationContent = conversation.fileMetadata.appData.content;
  const payloadJson: string = jsonStringify64({ ...conversationContent });

  const payloads: PayloadFile[] | undefined = [];
  const thumbnails: ThumbnailFile[] | undefined = [];
  const toDeletePayloads: { key: string }[] | undefined = [];
  if (imagePayload) {
    const { additionalThumbnails, tinyThumb } = await createThumbnails(
      imagePayload,
      CONVERSATION_IMAGE_KEY,
      [
        { quality: 80, maxPixelDimension: 75, maxBytes: 8 * 1024 },
        { quality: 80, maxPixelDimension: 300, maxBytes: 50 * 1024 },
      ]
    );

    payloads.push({
      key: CONVERSATION_IMAGE_KEY,
      payload: imagePayload,
    });
    thumbnails.push(...additionalThumbnails);
    conversation.fileMetadata.appData.previewThumbnail = tinyThumb;
  } else if (imagePayload === null) {
    toDeletePayloads.push({ key: CONVERSATION_IMAGE_KEY });
    conversation.fileMetadata.appData.previewThumbnail = undefined;
  }

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      archivalStatus: conversation.fileMetadata.appData.archivalStatus,
      uniqueId: conversation.fileMetadata.appData.uniqueId,
      fileType: conversation.fileMetadata.appData.fileType || CHAT_CONVERSATION_FILE_TYPE,
      content: payloadJson,
      previewThumbnail: conversation.fileMetadata.appData.previewThumbnail,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  return await patchFile(
    dotYouClient,
    conversation.sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    payloads,
    thumbnails,
    toDeletePayloads,
    !ignoreConflict
      ? async () => {
        const existingConversation = await getConversation(
          dotYouClient,
          conversation.fileMetadata.appData.uniqueId as string
        );
        if (!existingConversation) return;
        conversation.fileMetadata.versionTag = existingConversation.fileMetadata.versionTag;
        conversation.sharedSecretEncryptedKeyHeader =
          existingConversation.sharedSecretEncryptedKeyHeader;
        return updateConversation(dotYouClient, conversation, imagePayload, distribute, true);
      }
      : () => {
        // We just supress the warning; As we are ignoring the conflict following @param ignoreConflict
      }
  );
};

export interface ConversationMetadata {
  conversationId: string;
  lastReadTime?: number;
}

/**
 * @deprecated Use getConversation instead
 */
export const getConversationMetadata = async (
  dotYouClient: DotYouClient,
  conversationId: string
) => {
  if (conversationId === ConversationWithYourselfId) return null;

  const result = await queryBatch(
    dotYouClient,
    {
      fileType: [CHAT_CONVERSATION_LOCAL_METADATA_FILE_TYPE],
      tagsMatchAtLeastOne: [conversationId],
      targetDrive: ChatDrive,
    },
    { includeMetadataHeader: true, maxRecords: 2 }
  );

  if (!result || !result.searchResults?.length) return null;

  return dsrToConversationMetadata(dotYouClient, result.searchResults[0], ChatDrive, true);
};

const dsrToConversationMetadata = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<ConversationMetadata> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<ConversationMetadata>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const conversation: HomebaseFile<ConversationMetadata> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: {
            ...attrContent,
          },
        },
      },
    };

    return conversation;
  } catch (ex) {
    console.error('[chat] failed to get the ConversationMetadata of a dsr', dsr, ex);
    return null;
  }
};
