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
  sendCommand,
  uploadFile,
  uploadHeader,
  EncryptedKeyHeader,
} from '@youfoundation/js-lib/core';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { ImageSource } from '@youfoundation/ui-lib';

export const CHAT_CONVERSATION_FILE_TYPE = 8888;
export const GROUP_CHAT_CONVERSATION_FILE_TYPE = 8890;
export const ConversationWithYourselfId = 'e4ef2382-ab3c-405d-a8b5-ad3e09e980dd';
export const CONVERSATION_PAYLOAD_KEY = 'convo_pk';

export const ConversationWithYourself: HomebaseFile<SingleConversation> = {
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
      fileType: CHAT_CONVERSATION_FILE_TYPE,
      dataType: 0,
      content: {
        title: 'You',
        recipient: '',
      },
    },
    versionTag: '',
    payloads: [],
  },
  serverMetadata: undefined,
  priority: 0,
  sharedSecretEncryptedKeyHeader: {} as EncryptedKeyHeader,
};

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
    fileType: [CHAT_CONVERSATION_FILE_TYPE, GROUP_CHAT_CONVERSATION_FILE_TYPE],
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
      )) as HomebaseFile<Conversation>[]) || [],
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
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<Conversation> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<Conversation>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const identity = dotYouClient.getIdentity() as string;
    const recipients = (attrContent as GroupConversation)?.recipients?.filter(
      (recipient) => recipient !== identity
    );

    if (recipients && recipients.length === 1) {
      delete (attrContent as any).recipients;
      (attrContent as any).recipient = recipients[0];
    } else if (recipients && recipients.length > 1) {
      delete (attrContent as any).recipient;
      (attrContent as any).recipients = recipients;
    }

    const conversation: HomebaseFile<Conversation> = {
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
  conversation: NewHomebaseFile<Conversation>,
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
    undefined,
    undefined,
    undefined,
    onVersionConflict
  );
};

export const updateConversation = async (
  dotYouClient: DotYouClient,
  conversation: HomebaseFile<Conversation>
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
      fileType: conversation.fileMetadata.appData.fileType || CHAT_CONVERSATION_FILE_TYPE,
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

  if (!recipients || recipients.length === 0) {
    throw new Error('No recipients found for conversation');
  }

  const request: UpdateGroupConversationRequest = {
    title: conversation.title,
    conversationId,
  };

  return await sendCommand(
    dotYouClient,
    {
      code: UPDATE_GROUP_CONVERSATION_COMMAND,
      globalTransitIdList: [],
      jsonMessage: jsonStringify64(request),
      recipients,
    },
    ChatDrive
  );
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
