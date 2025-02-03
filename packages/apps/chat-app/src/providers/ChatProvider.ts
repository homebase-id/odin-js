import {
  AppFileMetaData,
  DotYouClient,
  HomebaseFile,
  EmbeddedThumb,
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
  deleteFile,
  UpdateHeaderInstructionSet,
  RichText,
  DEFAULT_PAYLOAD_KEY,
  MAX_HEADER_CONTENT_BYTES,
} from '@homebase-id/js-lib/core';
import {
  ChatDrive,
  ConversationMetadata,
  ConversationWithYourselfId,
  UnifiedConversation,
} from './ConversationProvider';
import {
  getNewId,
  jsonStringify64,
  stringToUint8Array,
  makeGrid,
  base64ToUint8Array,
  getRandom16ByteArray,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import { appId } from '../hooks/auth/useAuth';
import {
  createThumbnails,
  LinkPreview,
  LinkPreviewDescriptor,
  processVideoFile,
} from '@homebase-id/js-lib/media';
import { sendReadReceipt } from '@homebase-id/js-lib/peer';
import { ellipsisAtMaxChar, getPlainTextFromRichText } from '@homebase-id/common-app';
import { STARRED_MSG_TAG } from '../hooks/chat/useChatToggleMessageStar';

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
  replyId?: string;

  /// Content of the message
  message: string | RichText;

  // The author of the message
  /**
   * @deprecated Use fileMetadata.originalAuthor instead
   */
  authorOdinId?: string;

  // DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: ChatDeliveryStatus;
  deliveryDetails?: Record<string, ChatDeliveryStatus>;
}

const CHAT_MESSAGE_PAYLOAD_KEY = 'chat_web';
export const CHAT_LINKS_PAYLOAD_KEY = 'chat_links';

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

export const getStarredChatMessages = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined,
  pageSize: number
) => {
  const params: FileQueryParams = {
    targetDrive: ChatDrive,
    localTagsMatchAtLeastOne: [STARRED_MSG_TAG],
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
  const fileHeader = await getFileHeaderByUniqueId<string>(dotYouClient, ChatDrive, chatMessageId, {
    decrypt: false,
  });
  if (!fileHeader) return null;

  return await dsrToMessage(dotYouClient, fileHeader, ChatDrive, true);
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
      (msgContent.deliveryStatus === ChatDeliveryStatus.Sent ||
        msgContent.deliveryStatus === ChatDeliveryStatus.Failed) &&
      dsr.serverMetadata?.transferHistory?.recipients
    ) {
      msgContent.deliveryDetails = buildDeliveryDetails(
        dsr.serverMetadata.transferHistory.recipients
      );
      msgContent.deliveryStatus = stringGuidsEqual(
        dsr.fileMetadata.appData.groupId,
        ConversationWithYourselfId
      )
        ? ChatDeliveryStatus.Read
        : buildDeliveryStatus(msgContent.deliveryDetails);
    }

    const chatMessage: HomebaseFile<ChatMessage> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalAuthor: dsr.fileMetadata.originalAuthor || (msgContent as any)?.authorOdinId,
        appData: {
          ...dsr.fileMetadata.appData,
          content: msgContent,
        },
      },
    };

    return chatMessage;
  } catch (ex) {
    console.error('[chat] failed to get the chatMessage payload of a dsr', dsr, ex);
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
  if (values.every((val) => val === ChatDeliveryStatus.Read)) return ChatDeliveryStatus.Read;
  // If all are delivered/read, the message is delivered/read
  if (
    values.every((val) => val === ChatDeliveryStatus.Delivered || val === ChatDeliveryStatus.Read)
  )
    return ChatDeliveryStatus.Delivered;

  // If it exists, it's sent
  return ChatDeliveryStatus.Sent;
};

export const uploadChatMessage = async (
  dotYouClient: DotYouClient,
  message: NewHomebaseFile<ChatMessage>,
  recipients: string[],
  files: NewMediaFile[] | undefined,
  linkPreviews: LinkPreview[] | undefined,
  notificationBody?: string,
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
          priority: PriorityOptions.High,
          sendContents: SendContents.All,
          useAppNotification: true,
          appNotificationOptions: {
            appId: appId,
            typeId: message.fileMetadata.appData.groupId || getNewId(),
            tagId: message.fileMetadata.appData.uniqueId || getNewId(),
            silent: false,
            unEncryptedMessage: notificationBody,
          },
        }
      : undefined,
  };

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];
  const aesKey = getRandom16ByteArray();

  const jsonContent: string = jsonStringify64({ ...messageContent });
  const payloadBytes = stringToUint8Array(jsonStringify64({ message: messageContent.message }));

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < MAX_HEADER_CONTENT_BYTES;
  const content = shouldEmbedContent
    ? jsonContent
    : jsonStringify64({
        message: ellipsisAtMaxChar(getPlainTextFromRichText(messageContent.message), 400),
        replyId: messageContent.replyId,
        deliveryDetails: messageContent.deliveryDetails,
        deliveryStatus: messageContent.deliveryStatus,
      }); // We only embed the content if it's less than 3kb

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
    });
  }

  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      groupId: message.fileMetadata.appData.groupId,
      userDate: message.fileMetadata.appData.userDate,
      tags: message.fileMetadata.appData.tags,
      fileType: CHAT_MESSAGE_FILE_TYPE,
      content: content,
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.AutoConnected,
    },
  };

  if (!files?.length && linkPreviews?.length) {
    // We only support link previews when there is no media
    const descriptorContent = JSON.stringify(
      linkPreviews.map((preview) => {
        return {
          url: preview.url,
          hasImage: !!preview.imageUrl,
          imageWidth: preview.imageWidth,
          imageHeight: preview.imageHeight,
        } as LinkPreviewDescriptor;
      })
    );

    const imageUrl = linkPreviews.find((preview) => preview.imageUrl)?.imageUrl;

    const imageBlob = imageUrl
      ? new Blob([base64ToUint8Array(imageUrl.split(',')[1])], {
          type: imageUrl.split(';')[0].split(':')[1],
        })
      : undefined;

    const { tinyThumb } = imageBlob
      ? await createThumbnails(imageBlob, '', [])
      : { tinyThumb: undefined };

    payloads.push({
      key: CHAT_LINKS_PAYLOAD_KEY,
      payload: new Blob([stringToUint8Array(JSON.stringify(linkPreviews))], {
        type: 'application/json',
      }),
      descriptorContent,
      previewThumbnail: tinyThumb,
    });
  }

  for (let i = 0; files && i < files?.length; i++) {
    const payloadKey = `${CHAT_MESSAGE_PAYLOAD_KEY}${i}`;
    const newMediaFile = files[i];
    if (newMediaFile.file.type.startsWith('video/')) {
      const {
        tinyThumb,
        thumbnails: thumbnailsFromVideo,
        payloads: payloadsFromVideo,
      } = await processVideoFile(newMediaFile, payloadKey, aesKey);

      thumbnails.push(...thumbnailsFromVideo);
      payloads.push(...payloadsFromVideo);

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
        descriptorContent: (newMediaFile.file as File).name || newMediaFile.file.type,
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    } else {
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
        descriptorContent: (newMediaFile.file as File).name || newMediaFile.file.type,
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
    onVersionConflict,
    {
      aesKey,
    }
  );

  if (!uploadResult) throw new Error('Failed to upload chat message');

  if (
    recipients.some(
      (recipient) =>
        uploadResult.recipientStatus?.[recipient].toLowerCase() ===
        TransferUploadStatus.EnqueuedFailed
    )
  ) {
    message.fileId = uploadResult.file.fileId;
    message.fileMetadata.versionTag = uploadResult.newVersionTag;
    message.fileMetadata.appData.content.deliveryStatus = ChatDeliveryStatus.Sent;
    message.fileMetadata.appData.content.deliveryDetails = {};
    for (const recipient of recipients) {
      message.fileMetadata.appData.content.deliveryDetails[recipient] =
        uploadResult.recipientStatus?.[recipient].toLowerCase() ===
        TransferUploadStatus.EnqueuedFailed
          ? ChatDeliveryStatus.Failed
          : ChatDeliveryStatus.Delivered;
    }

    const updateResult = await updateChatMessage(
      dotYouClient,
      message,
      recipients,
      uploadResult.keyHeader
    );
    console.warn('Not all recipients received the message: ', uploadResult);
    // We don't throw an error as it is not a critical failure; And the message is still saved locally
    return {
      ...uploadResult,
      newVersionTag: updateResult?.newVersionTag || uploadResult?.newVersionTag,
      previewThumbnail: uploadMetadata.appData.previewThumbnail,
      chatDeliveryStatus: ChatDeliveryStatus.Sent, // Should we set failed, or does an enqueueFailed have a retry? (Either way it should auto-solve if it does)
    };
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
    chatDeliveryStatus: ChatDeliveryStatus.Sent,
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

  const uploadInstructions: UpdateHeaderInstructionSet = {
    storageOptions: {
      drive: ChatDrive,
      overwriteFileId: message.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...recipients],
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.High,
          sendContents: SendContents.All,
        }
      : undefined,
    storageIntent: 'header',
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
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.AutoConnected,
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
      if (!existingChatMessage) return;
      message.fileMetadata.versionTag = existingChatMessage.fileMetadata.versionTag;
      return await updateChatMessage(dotYouClient, message, recipients, keyHeader);
    }
  );
};

export const hardDeleteChatMessage = async (
  dotYouClient: DotYouClient,
  message: HomebaseFile<ChatMessage>
) => {
  return await deleteFile(dotYouClient, ChatDrive, message.fileId, []);
};

export const softDeleteChatMessage = async (
  dotYouClient: DotYouClient,
  message: HomebaseFile<ChatMessage>,
  recipients: string[],
  deleteForEveryone?: boolean
) => {
  message.fileMetadata.appData.archivalStatus = ChatDeletedArchivalStaus;
  let runningVersionTag = message.fileMetadata.versionTag;

  for (let i = 0; message.fileMetadata.payloads && i < message.fileMetadata.payloads.length; i++) {
    const payload = message.fileMetadata.payloads[i];
    // TODO: Should the payload be deleted for everyone? With "TransitOptions"; Needs server side support for it;
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
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>,
  messages: HomebaseFile<ChatMessage>[]
) => {
  const chatFileIds = messages
    .filter(
      (msg) =>
        msg.fileMetadata.appData.content.deliveryStatus !== ChatDeliveryStatus.Read &&
        msg.fileMetadata.senderOdinId &&
        msg.fileMetadata.senderOdinId !== dotYouClient.getHostIdentity()
    )
    .map((msg) => msg.fileId) as string[];

  return sendReadReceipt(dotYouClient, ChatDrive, chatFileIds);
};
