import {
  AppFileMetaData,
  DotYouClient,
  HomebaseFile,
  EmbeddedThumb,
  FileMetadata,
  FileQueryParams,
  GetBatchQueryResultOptions,
  KeyHeader,
  NewHomebaseFile,
  PayloadFile,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  ThumbnailFile,
  UploadFileMetadata,
  UploadInstructionSet,
  deleteFilesByGroupId,
  deletePayload,
  getContentFromHeaderOrPayload,
  getFileHeaderByUniqueId,
  queryBatch,
  uploadFile,
  uploadHeader,
  NewMediaFile,
  UploadResult,
  PriorityOptions,
  TransferUploadStatus,
  TransferStatus,
  FailedTransferStatuses,
  RecipientTransferHistory,
} from '@youfoundation/js-lib/core';
import { ChatDrive, UnifiedConversation } from './ConversationProvider';
import { getNewId, jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { makeGrid } from '@youfoundation/js-lib/helpers';
import { appId } from '../hooks/auth/useAuth';
import { createThumbnails, processVideoFile } from '@youfoundation/js-lib/media';
import { sendReadReceipt } from '@youfoundation/js-lib/peer';

export const CHAT_MESSAGE_FILE_TYPE = 7878;
export const ChatDeletedArchivalStaus = 2;

export enum ChatDeliveryStatus {
  // NotSent = 10, // NotSent is not a valid atm, when it's not sent, it doesn't "exist"
  Sending = 15, // When it's sending; Used for optimistic updates

  Sent = 20, // when delivered to your identity
  Delivered = 30, // when delivered to the recipient inbox
  Read = 40, // when the recipient has read the message
  Failed = 50, // when the message failed to send to the recipient
}

export interface ChatMessage {
  // /// ReplyId used to get the replyId of the message
  replyId?: string; //=> Better to use the groupId (unless that would break finding the messages of a conversation)...

  /// FileState of the Message
  /// [FileState.active] shows the message is active
  /// [FileState.deleted] shows the message is deleted. It's soft deleted
  // fileState: FileState => archivalStatus

  /// Content of the message
  message: string;

  /// DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: ChatDeliveryStatus;
  deliveryDetails?: Record<string, ChatDeliveryStatus>;
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
    includeTransferHistory: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);
  return {
    ...response,
    searchResults:
      ((await Promise.all(
        response.searchResults
          .map(async (result) => await dsrToMessage(dotYouClient, result, ChatDrive, true))
          .filter(Boolean)
      )) as HomebaseFile<ChatMessage>[]) || [],
  };
};

export const deleteAllChatMessages = async (dotYouClient: DotYouClient, conversationId: string) => {
  return await deleteFilesByGroupId(dotYouClient, ChatDrive, [conversationId]);
};

export const getChatMessage = async (dotYouClient: DotYouClient, chatMessageId: string) => {
  const fileHeader = await getFileHeaderByUniqueId<ChatMessage>(
    dotYouClient,
    ChatDrive,
    chatMessageId
  );
  if (!fileHeader) return null;

  return fileHeader;
};

export const dsrToMessage = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<ChatMessage> | null> => {
  try {
    const msgContent = await getContentFromHeaderOrPayload<ChatMessage>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!msgContent) return null;

    if (
      msgContent.deliveryStatus === ChatDeliveryStatus.Sent &&
      dsr.serverMetadata?.transferHistory?.recipients
    ) {
      msgContent.deliveryDetails = buildDeliveryDetails(
        dsr.serverMetadata.transferHistory.recipients
      );
      msgContent.deliveryStatus = buildDeliveryStatus(msgContent.deliveryDetails);
    }

    const chatMessage: HomebaseFile<ChatMessage> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: msgContent,
        },
      },
    };

    return chatMessage;
  } catch (ex) {
    console.error('[DotYouCore-js] failed to get the chatMessage payload of a dsr', dsr, ex);
    return null;
  }
};

const buildDeliveryDetails = (recipientTransferHistory: {
  [key: string]: RecipientTransferHistory;
}): Record<string, ChatDeliveryStatus> => {
  const deliveryDetails: Record<string, ChatDeliveryStatus> = {};

  for (const recipient of Object.keys(recipientTransferHistory)) {
    if (recipientTransferHistory[recipient].latestSuccessfullyDeliveredVersionTag) {
      if (recipientTransferHistory[recipient].isReadByRecipient) {
        deliveryDetails[recipient] = ChatDeliveryStatus.Read;
      } else {
        deliveryDetails[recipient] = ChatDeliveryStatus.Delivered;
      }
    } else {
      const latest = recipientTransferHistory[recipient].latestTransferStatus;
      const transferStatus =
        latest && typeof latest === 'string'
          ? (latest?.toLocaleLowerCase() as TransferStatus)
          : undefined;
      if (transferStatus && FailedTransferStatuses.includes(transferStatus)) {
        deliveryDetails[recipient] = ChatDeliveryStatus.Failed;
      } else {
        deliveryDetails[recipient] = ChatDeliveryStatus.Sent;
      }
    }
  }

  return deliveryDetails;
};

const buildDeliveryStatus = (
  deliveryDetails: Record<string, ChatDeliveryStatus>
): ChatDeliveryStatus => {
  const values = Object.values(deliveryDetails);
  // If any failed, the message is failed
  if (values.includes(ChatDeliveryStatus.Failed)) return ChatDeliveryStatus.Failed;
  // If all are delivered/read, the message is delivered/read
  if (values.every((val) => val === ChatDeliveryStatus.Delivered))
    return ChatDeliveryStatus.Delivered;
  if (values.every((val) => val === ChatDeliveryStatus.Read)) return ChatDeliveryStatus.Read;

  // If it exists, it's sent
  return ChatDeliveryStatus.Sent;
};

export const uploadChatMessage = async (
  dotYouClient: DotYouClient,
  message: NewHomebaseFile<ChatMessage>,
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
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.Medium,
          sendContents: SendContents.All,
          useAppNotification: true,
          appNotificationOptions: {
            appId: appId,
            typeId: message.fileMetadata.appData.groupId as string,
            tagId: getNewId(),
            silent: false,
          },
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
      userDate: message.fileMetadata.appData.userDate,
      fileType: CHAT_MESSAGE_FILE_TYPE,
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
      const { tinyThumb, additionalThumbnails, payload } = await processVideoFile(
        newMediaFile,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push(payload);

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    } else if (newMediaFile.file.type.startsWith('image/')) {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.file,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
        previewThumbnail: tinyThumb,
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    } else {
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
      });
    }
  }

  uploadMetadata.appData.previewThumbnail =
    previewThumbnails.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

  const uploadResult = await uploadFile(
    dotYouClient,
    uploadInstructions,
    uploadMetadata,
    payloads,
    thumbnails,
    undefined,
    onVersionConflict
  );

  if (!uploadResult) return null;

  if (
    recipients.some(
      (recipient) =>
        uploadResult.recipientStatus?.[recipient].toLowerCase() ===
        TransferUploadStatus.EnqueuedFailed
    )
  ) {
    message.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Failed;
    message.fileMetadata.appData.content.deliveryDetails = {};
    for (const recipient of recipients) {
      message.fileMetadata.appData.content.deliveryDetails[recipient] =
        uploadResult.recipientStatus?.[recipient].toLowerCase() ===
        TransferUploadStatus.EnqueuedFailed
          ? ChatDeliveryStatus.Failed
          : ChatDeliveryStatus.Delivered;
    }

    await updateChatMessage(dotYouClient, message, recipients, uploadResult.keyHeader);

    console.error('Not all recipients received the message: ', uploadResult);
    throw new Error(`Not all recipients received the message: ${recipients.join(', ')}`);
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const updateChatMessage = async (
  dotYouClient: DotYouClient,
  message: HomebaseFile<ChatMessage> | NewHomebaseFile<ChatMessage>,
  recipients: string[],
  keyHeader?: KeyHeader
): Promise<UploadResult | void> => {
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
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.Medium,
          sendContents: SendContents.All,
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
      archivalStatus: (message.fileMetadata.appData as AppFileMetaData<ChatMessage>).archivalStatus,
      previewThumbnail: message.fileMetadata.appData.previewThumbnail,
      fileType: CHAT_MESSAGE_FILE_TYPE,
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
    keyHeader || (message as HomebaseFile<ChatMessage>).sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    async () => {
      const existingChatMessage = await getChatMessage(
        dotYouClient,
        message.fileMetadata.appData.uniqueId as string
      );
      if (!existingChatMessage) return null;
      message.fileMetadata.versionTag = existingChatMessage.fileMetadata.versionTag;
      return await updateChatMessage(dotYouClient, message, recipients, keyHeader);
    }
  );
};

export const softDeleteChatMessage = async (
  dotYouClient: DotYouClient,
  message: HomebaseFile<ChatMessage>,
  recipients: string[],
  deleteForEveryone?: boolean
) => {
  message.fileMetadata.appData.archivalStatus = ChatDeletedArchivalStaus;
  let runningVersionTag = message.fileMetadata.versionTag;

  for (let i = 0; i < message.fileMetadata.payloads.length; i++) {
    const payload = message.fileMetadata.payloads[i];
    // TODO: Should the payload be deleted for everyone? With "TransitOptions"
    const deleteResult = await deletePayload(
      dotYouClient,
      ChatDrive,
      message.fileId,
      payload.key,
      runningVersionTag
    );

    if (!deleteResult) throw new Error('Failed to delete payload');
    runningVersionTag = deleteResult.newVersionTag;
  }

  message.fileMetadata.versionTag = runningVersionTag;
  message.fileMetadata.appData.content.message = '';
  return await updateChatMessage(dotYouClient, message, deleteForEveryone ? recipients : []);
};

export const requestMarkAsRead = async (
  dotYouClient: DotYouClient,
  conversation: HomebaseFile<UnifiedConversation>,
  messages: HomebaseFile<ChatMessage>[]
) => {
  const chatFileIds = messages
    .filter(
      (msg) =>
        msg.fileMetadata.appData.content.deliveryStatus !== ChatDeliveryStatus.Read &&
        msg.fileMetadata.senderOdinId
    )
    .map((msg) => msg.fileId) as string[];

  return sendReadReceipt(dotYouClient, ChatDrive, chatFileIds);
};
