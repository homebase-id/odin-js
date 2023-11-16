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
  uploadFile,
} from '@youfoundation/js-lib/core';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';

export const ConversationFileType = 8888;
export const GroupConversationFileType = 8890;

export const ChatDrive: TargetDrive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

enum MessageType {
  Text = 0,
  Image = 1,
  Video = 2,
  Audio = 3,
  File = 4,
  Location = 5,
  Sticker = 6,
  Contact = 7,
  Custom = 8,
}

export interface ChatMessageContent {
  text: string;
  payload: string; // base64 encoded bytes?
}

enum DeliveryStatus {
  NotSent = 10,
  Sending = 15,
  Sent = 20,
  Delivered = 30,
  Read = 40,
  Failed = 50,
}

export interface ChatMessage {
  // sender: string

  /// FileId of the message. Set on the server. Could be used as a uniqueId
  // fileId: string

  /// ClientUniqueId. Set by the device
  id: string;

  /// Timestamp when the message was created
  receivedTimestamp: number;

  /// Timestamp when the message was updated
  updatedTimestamp: number;

  /// GlobalTransitId of the payload. Same across all the recipients
  globalTransitId: string;

  /// GroupId of the payload.
  conversationId: string;

  /// ReplyId used to get the replyId of the message
  replyId: string;

  /// Type of the message. It's the fileType from the server
  messageType: MessageType;

  /// FileState of the Message
  /// [FileState.active] shows the message is active
  /// [FileState.deleted] shows the message is deleted. It's soft deleted
  // fileState: FileState => archivalStatus

  /// Content of the message
  message: ChatMessageContent;

  reactions: string;

  /// DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: DeliveryStatus;

  /// List of tags for the message
  /// Could be used to assign tags to the message
  /// E.g Could be a replyId
  tags: string[];

  /// List of recipients of the message that it is intended to be sent to.
  recipients: string[];
}

export interface Conversation {
  conversationId: string;
  title: string;
  imgId?: string;
  messageType: MessageType;
  recipient: string;
  unread: boolean;
  unreadCount: number;
  message: ChatMessage;
}

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
