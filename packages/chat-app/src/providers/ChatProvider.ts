import {
  DotYouClient,
  DriveSearchResult,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewDriveSearchResult,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  UploadFileMetadata,
  UploadInstructionSet,
  getContentFromHeaderOrPayload,
  queryBatch,
  uploadFile,
} from '@youfoundation/js-lib/core';
import { ChatDrive, ChatMessage } from './ConversationProvider';
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

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: message.fileId,
    },
    transitOptions:
      messageContent.recipients?.length > 0
        ? {
            recipients: messageContent.recipients,
            schedule: ScheduleOptions.SendNowAwaitResponse,
            sendContents: SendContents.All,
            useGlobalTransitId: true,
          }
        : undefined,
  };

  messageContent.recipients = [];
  const payloadJson: string = jsonStringify64({ ...messageContent });

  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: messageContent.id,
      groupId: messageContent.conversationId,
      fileType: messageContent.messageType,
      content: payloadJson,
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
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
