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
} from '@youfoundation/js-lib/core';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';

export const ConversationFileType = 8888;
export const GroupConversationFileType = 8890;

export const ChatDrive: TargetDrive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

interface BaseConversation {
  conversationId: string;
  title: string;
  imgId?: string;
  unread: boolean;
  unreadCount: number;
  // messageType: MessageType;
  // message: ChatMessage;
}

export interface SingleConversation extends BaseConversation {
  recipient: string;
}

export interface GroupConversation extends BaseConversation {
  recipients: string[];
}

export type Conversation = SingleConversation | GroupConversation;

const JOIN_GROUP_CONVERSATION_COMMAND = 110;
const DELETE_CHAT_COMMAND = 180;

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
      uniqueId: conversationContent.conversationId,
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

export const JOIN_CONVERSATION_COMMAND = 100;
export interface JoinConversationRequest {
  conversationId: string;
  title: string;
}

export const requestConversationCommand = async (
  dotYouClient: DotYouClient,
  conversation: Conversation
) => {
  const request: JoinConversationRequest = {
    conversationId: conversation.conversationId,
    title: conversation.title,
  };

  return await sendCommand(
    dotYouClient,
    {
      code: JOIN_CONVERSATION_COMMAND,
      globalTransitIdList: [],
      jsonMessage: jsonStringify64(request),
      recipients: (conversation as GroupConversation).recipients || [
        (conversation as SingleConversation).recipient,
      ],
    },
    ChatDrive
  );
};
