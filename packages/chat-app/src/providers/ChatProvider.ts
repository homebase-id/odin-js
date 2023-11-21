import {
  DotYouClient,
  DriveSearchResult,
  EmbeddedThumb,
  FileMetadata,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
  NewDriveSearchResult,
  PayloadFile,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  ThumbnailFile,
  UploadFileMetadata,
  UploadInstructionSet,
  createThumbnails,
  getContentFromHeaderOrPayload,
  queryBatch,
  sendCommand,
  uploadFile,
  uploadHeader,
} from '@youfoundation/js-lib/core';
import {
  ChatDrive,
  Conversation,
  GroupConversation,
  SingleConversation,
} from './ConversationProvider';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { NewMediaFile } from '@youfoundation/js-lib/dist';

export enum ChatDeliveryStatus {
  // NotSent = 10, // NotSent is not a valid atm, when it's not sent, it doesn't "exist"
  // Sending = 15, // Sending is covered by the upload state of the hook

  Sent = 20, // when delivered to your identity
  Delivered = 30, // when delivered to the recipient inbox
  Read = 40, // when the recipient has read the message
  Failed = 50, // when the message failed to send to the recipient
}

export enum MessageType {
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

export interface ChatMessage {
  /// ClientUniqueId. Set by the device
  id: string;

  /// GroupId of the payload.
  conversationId: string;

  // /// ReplyId used to get the replyId of the message
  // replyId: string;

  /// Type of the message. It's the fileType from the server
  messageType: MessageType;

  /// FileState of the Message
  /// [FileState.active] shows the message is active
  /// [FileState.deleted] shows the message is deleted. It's soft deleted
  // fileState: FileState => archivalStatus

  /// Content of the message
  message: string;

  // reactions: string;

  /// DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: ChatDeliveryStatus;

  /// List of tags for the message
  /// Could be used to assign tags to the message
  /// E.g Could be a replyId
  // tags: string[];

  // It's stupid.. I know, the senderOdinId contains it as well.. Until you update your local file..
  authorOdinId: string;

  /// List of recipients of the message that it is intended to be sent to.
  recipients: string[];
}

const CHAT_MESSAGE_PAYLOAD_KEY = 'chat_web';

export const getChatMessages = async (
  dotYouClient: DotYouClient,
  conversationId: string,
  cursorState: string | undefined,
  pageSize: number
) => {
  const params: FileQueryParams = {
    targetDrive: ChatDrive,
    groupId: [conversationId],
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
        async (result) => await dsrToMessage(dotYouClient, result, ChatDrive, true)
      )
    ),
  };
};

export const dsrToMessage = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<DriveSearchResult<ChatMessage> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<ChatMessage>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const chatMessage: DriveSearchResult<ChatMessage> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: attrContent,
        },
      },
    };

    return chatMessage;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the chatMessage payload of a dsr', dsr, ex);
    return null;
  }
};

export const uploadChatMessage = async (
  dotYouClient: DotYouClient,
  message: NewDriveSearchResult<ChatMessage>,
  files: NewMediaFile[] | undefined,
  onVersionConflict?: () => void
) => {
  const messageContent = message.fileMetadata.appData.content;
  const distribute = messageContent.recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: message.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...messageContent.recipients],
          schedule: ScheduleOptions.SendNowAwaitResponse,
          sendContents: SendContents.All,
          useGlobalTransitId: true,
        }
      : undefined,
  };

  const jsonContent: string = jsonStringify64({ ...messageContent, recipients: undefined });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      uniqueId: messageContent.id,
      groupId: messageContent.conversationId,
      fileType: messageContent.messageType,
      content: jsonContent,
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Connected,
    },
  };

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumbnail: EmbeddedThumb | undefined;

  for (let i = 0; files && i < files?.length; i++) {
    const payloadKey = `${CHAT_MESSAGE_PAYLOAD_KEY}${i}`;
    const newMediaFile = files[i];
    if (newMediaFile.file.type.startsWith('video/')) {
      throw new Error('Video is not supported yet');
    } else {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.file,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
      });

      if (!previewThumbnail) previewThumbnail = tinyThumb;
    }
  }

  uploadMetadata.appData.previewThumbnail = previewThumbnail;

  return await uploadFile(
    dotYouClient,
    uploadInstructions,
    uploadMetadata,
    payloads,
    thumbnails,
    undefined,
    onVersionConflict
  );
};

export const updateChatMessage = async (
  dotYouClient: DotYouClient,
  message: DriveSearchResult<ChatMessage> | NewDriveSearchResult<ChatMessage>,
  keyHeader?: KeyHeader
) => {
  const messageContent = message.fileMetadata.appData.content;
  const distribute = false; //messageContent.recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: message.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...messageContent.recipients],
          schedule: ScheduleOptions.SendNowAwaitResponse,
          sendContents: SendContents.All,
          useGlobalTransitId: true,
        }
      : undefined,
  };

  const payloadJson: string = jsonStringify64({ ...messageContent, recipients: undefined });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      uniqueId: messageContent.id,
      groupId: messageContent.conversationId,
      fileType: messageContent.messageType,
      content: payloadJson,
    },
    senderOdinId: (message.fileMetadata as FileMetadata<ChatMessage>).senderOdinId,
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Connected,
    },
  };

  return await uploadHeader(
    dotYouClient,
    keyHeader || (message as DriveSearchResult<ChatMessage>).sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata
  );
};

export const MARK_CHAT_READ_COMMAND = 150;
export interface MarkAsReadRequest {
  conversationId: string;
  messageIds: string[];
}

export const requestMarkAsRead = async (
  dotYouClient: DotYouClient,
  conversation: Conversation,
  chatGlobalTransitIds: string[]
) => {
  const request: MarkAsReadRequest = {
    conversationId: conversation.conversationId,
    messageIds: chatGlobalTransitIds,
  };

  return await sendCommand(
    dotYouClient,
    {
      code: MARK_CHAT_READ_COMMAND,
      globalTransitIdList: [],
      jsonMessage: jsonStringify64(request),
      recipients: (conversation as GroupConversation).recipients || [
        (conversation as SingleConversation).recipient,
      ],
    },
    ChatDrive
  );
};
