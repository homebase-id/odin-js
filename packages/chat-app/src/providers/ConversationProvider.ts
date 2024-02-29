import {
  DotYouClient,
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewDriveSearchResult,
  SecurityGroupType,
  TargetDrive,
  UploadFileMetadata,
  UploadInstructionSet,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  queryBatch,
  sendCommand,
  uploadFile,
  uploadHeader,
} from '@youfoundation/js-lib/core';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { ImageSource } from '@youfoundation/ui-lib';

export const ConversationFileType = 8888;
export const GroupConversationFileType = 8890;
export const ConversationWithYourselfId = 'e4ef2382-ab3c-405d-a8b5-ad3e09e980dd';
export const CONVERSATION_PAYLOAD_KEY = 'convo_pk';

export const ConversationWithYourself: DriveSearchResult<SingleConversation> = {
  fileState: 'active',
  fileId: '',
  fileSystemType: 'Standard',
  fileMetadata: {
    created: 0,
    updated: 0,
    isEncrypted: false,
    senderOdinId: '',
    appData: {
      uniqueId: ConversationWithYourselfId,
      fileType: ConversationFileType,
      dataType: 0,
      content: {},
    },
    versionTag: '',
    payloads: [],
  },
  serverMetadata: undefined,
  priority: 0,
} as any as DriveSearchResult<SingleConversation>;

export const ChatDrive: TargetDrive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

interface BaseConversation {
  title: string;
  // imgId?: string;
  lastReadTime?: number;
}

export interface SingleConversation extends BaseConversation {
  recipient: string;
}

export interface GroupConversation extends BaseConversation {
  recipients: string[];
}

export type Conversation = SingleConversation | GroupConversation;

export const getConversations = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined,
  pageSize: number
) => {
  const params: FileQueryParams = {
    targetDrive: ChatDrive,
    fileType: [ConversationFileType, GroupConversationFileType],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  return {
    ...response,
    searchResults: await Promise.all(
      response.searchResults.map(
        async (result) => await dsrToConversation(dotYouClient, result, ChatDrive, true)
      )
    ),
  };
};

export const getConversation = async (dotYouClient: DotYouClient, conversationId: string) => {
  if (conversationId === ConversationWithYourselfId) return ConversationWithYourself;

  const conversationHeader = await getFileHeaderByUniqueId<Conversation>(
    dotYouClient,
    ChatDrive,
    conversationId
  );
  if (!conversationHeader) return null;
  return conversationHeader;
};

export const dsrToConversation = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<DriveSearchResult<Conversation> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<Conversation>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const conversation: DriveSearchResult<Conversation> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: attrContent,
        },
      },
    };

    return conversation;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the conversation payload of a dsr', dsr, ex);
    return null;
  }
};

export const uploadConversation = async (
  dotYouClient: DotYouClient,
  conversation: NewDriveSearchResult<Conversation>,
  onVersionConflict?: () => void
) => {
  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: conversation.fileId,
    },
  };

  const conversationContent = conversation.fileMetadata.appData.content;
  const payloadJson: string = jsonStringify64({ ...conversationContent });

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: conversation.fileMetadata.appData.uniqueId,
      fileType: conversation.fileMetadata.appData.fileType || ConversationFileType,
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
    undefined,
    undefined,
    undefined,
    onVersionConflict
  );
};

export const updateConversation = async (
  dotYouClient: DotYouClient,
  conversation: DriveSearchResult<Conversation>
) => {
  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: conversation.fileId,
    },
  };

  const conversationContent = conversation.fileMetadata.appData.content;
  const payloadJson: string = jsonStringify64({ ...conversationContent });

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      archivalStatus: conversation.fileMetadata.appData.archivalStatus,
      uniqueId: conversation.fileMetadata.appData.uniqueId,
      fileType: conversation.fileMetadata.appData.fileType || ConversationFileType,
      content: payloadJson,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  return await uploadHeader(
    dotYouClient,
    conversation.sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    () => {
      // Ignore version conflict; Updates are not critical; (Most likely race condition between multiple clients)
    }
  );
};

export const JOIN_CONVERSATION_COMMAND = 100;
export const JOIN_GROUP_CONVERSATION_COMMAND = 110;
export const UPDATE_GROUP_CONVERSATION_COMMAND = 111;


export interface JoinConversationRequest {
  conversationId: string;
  title: string;
}

export interface UpdateGroupConversationRequest {
  title: string;
  image?: ImageSource;
  conversationId: string;
}

export interface JoinGroupConversationRequest extends JoinConversationRequest {
  recipients: string[];
}

export const updateGroupConversationCommand = async (
  dotYouClient: DotYouClient,
  conversation: GroupConversation,
  conversationId: string
) => {
  const recipients = conversation.recipients;

  if (!recipients || recipients.length === 0) { throw new Error('No recipients found for conversation'); }

  const request: UpdateGroupConversationRequest = {
    title: conversation.title,
    conversationId,
  };

  return await sendCommand(dotYouClient, {
    code: UPDATE_GROUP_CONVERSATION_COMMAND,
    globalTransitIdList: [],
    jsonMessage: jsonStringify64(request),
    recipients,
  }, ChatDrive);

};

export const requestConversationCommand = async (
  dotYouClient: DotYouClient,
  conversation: Conversation,
  conversationId: string
) => {
  const recipients = (conversation as GroupConversation).recipients || [
    (conversation as SingleConversation).recipient,
  ];

  if (!recipients || recipients.length === 0)
    throw new Error('No recipients found for conversation');

  const request: JoinConversationRequest | JoinGroupConversationRequest = {
    conversationId: conversationId,
    title: conversation.title,
    recipients: recipients.length > 1 ? recipients : undefined,
  };

  return await sendCommand(
    dotYouClient,
    {
      code: recipients.length > 1 ? JOIN_GROUP_CONVERSATION_COMMAND : JOIN_CONVERSATION_COMMAND,
      globalTransitIdList: [],
      jsonMessage: jsonStringify64(request),
      recipients,
    },
    ChatDrive
  );
};
