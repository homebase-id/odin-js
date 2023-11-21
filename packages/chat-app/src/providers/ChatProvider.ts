import {
  DotYouClient,
  DriveSearchResult,
  FileMetadata,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
  NewDriveSearchResult,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  UploadFileMetadata,
  UploadInstructionSet,
  getContentFromHeaderOrPayload,
  queryBatch,
  sendCommand,
  uploadFile,
  uploadHeader,
} from '@youfoundation/js-lib/core';
import {
  ChatDrive,
  ChatMessage,
  Conversation,
  GroupConversation,
  SingleConversation,
} from './ConversationProvider';
import { jsonStringify64 } from '@youfoundation/js-lib/helpers';

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
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Connected,
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
