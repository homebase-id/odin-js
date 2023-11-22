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
import { makeGrid } from '@youfoundation/js-lib/helpers';
import { NewMediaFile } from '@youfoundation/js-lib/public';

export const ChatMessageFileType = 7878;

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
  // /// ReplyId used to get the replyId of the message
  // replyId: string; => Better to use the groupId (unless that would break finding the messages of a conversation)...

  /// Type of the message
  // messageType: MessageType;

  /// FileState of the Message
  /// [FileState.active] shows the message is active
  /// [FileState.deleted] shows the message is deleted. It's soft deleted
  // fileState: FileState => archivalStatus

  /// Content of the message
  message: string;

  // reactions: string;

  /// DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: ChatDeliveryStatus;
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
  recipients: string[],
  files: NewMediaFile[] | undefined,
  onVersionConflict?: () => void
) => {
  const messageContent = message.fileMetadata.appData.content;
  const distribute = recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: message.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...recipients],
          schedule: ScheduleOptions.SendNowAwaitResponse,
          sendContents: SendContents.All,
          useGlobalTransitId: true,
        }
      : undefined,
  };

  const jsonContent: string = jsonStringify64({ ...messageContent });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      groupId: message.fileMetadata.appData.groupId,
      fileType: ChatMessageFileType,
      content: jsonContent,
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Connected,
    },
  };

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];

  for (let i = 0; files && i < files?.length; i++) {
    const payloadKey = `${CHAT_MESSAGE_PAYLOAD_KEY}${i}`;
    const newMediaFile = files[i];
    if (newMediaFile.file.type.startsWith('video/')) {
      throw new Error('Video is not supported yet');
    } else {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.file,
        payloadKey,
        [
          { quality: 75, width: 250, height: 250 },
          { quality: 75, width: 1600, height: 1600 },
        ]
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    }
  }

  uploadMetadata.appData.previewThumbnail =
    previewThumbnails.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

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
  recipients: string[],
  keyHeader?: KeyHeader
) => {
  const messageContent = message.fileMetadata.appData.content;
  const distribute = recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: message.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...recipients],
          schedule: ScheduleOptions.SendNowAwaitResponse,
          sendContents: SendContents.All,
          useGlobalTransitId: true,
        }
      : undefined,
  };

  const payloadJson: string = jsonStringify64({ ...messageContent });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      groupId: message.fileMetadata.appData.groupId,
      fileType: ChatMessageFileType,
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
