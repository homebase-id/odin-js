import {
  DotYouClient,
  NewHomebaseFile,
  NewMediaFile,
  UploadInstructionSet,
  ScheduleOptions,
  PriorityOptions,
  SendContents,
  UploadFileMetadata,
  SecurityGroupType,
  PayloadFile,
  ThumbnailFile,
  EmbeddedThumb,
  uploadFile,
  TransferUploadStatus,
  HomebaseFile,
  KeyHeader,
  UploadResult,
  AppFileMetaData,
  FileMetadata,
  uploadHeader,
  getFileHeaderByUniqueId,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
  getContentFromHeaderOrPayload,
  RecipientTransferHistory,
  TransferStatus,
  FailedTransferStatuses,
  queryBatch,
  deleteFile,
  RichText,
} from '@homebase-id/js-lib/core';
import {
  getNewId,
  jsonStringify64,
  stringToUint8Array,
  makeGrid,
  getRandom16ByteArray,
} from '@homebase-id/js-lib/helpers';
import {
  LinkPreview,
  LinkPreviewDescriptor,
  processVideoFile,
  createThumbnails,
} from '@homebase-id/js-lib/media';
import { appId } from '../hooks/auth/useAuth';
import { getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';

export const COMMUNITY_MESSAGE_FILE_TYPE = 7020;
export const CommunityDeletedArchivalStaus = 2;

const COMMUNITY_MESSAGE_PAYLOAD_KEY = 'comm_web';
export const COMMUNITY_LINKS_PAYLOAD_KEY = 'comm_links';

export enum CommunityDeliveryStatus {
  // NotSent = 10, // NotSent is not a valid atm, when it's not sent, it doesn't "exist"
  Sending = 15, // When it's sending; Used for optimistic updates

  Sent = 20, // when delivered to your identity
  Delivered = 30, // when delivered to the recipient inbox
  Read = 40, // when the recipient has read the message
  Failed = 50, // when the message failed to send to the recipient
}

export interface CommunityMessage {
  replyId?: string;

  /// Content of the message
  message: string | RichText;

  // After an update to a message on the receiving end, the senderOdinId is emptied; So we have an authorOdinId to keep track of the original sender
  authorOdinId?: string;

  /// DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: CommunityDeliveryStatus;
  deliveryDetails?: Record<string, CommunityDeliveryStatus>;

  channelId: string;
}

export const uploadCommunityMessage = async (
  dotYouClient: DotYouClient,
  communityId: string,
  message: NewHomebaseFile<CommunityMessage>,
  recipients: string[],
  files: NewMediaFile[] | undefined,
  linkPreviews: LinkPreview[] | undefined,
  onVersionConflict?: () => void
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const messageContent = message.fileMetadata.appData.content;
  const distribute = recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: targetDrive,
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
      tags: message.fileMetadata.appData.tags,
      fileType: COMMUNITY_MESSAGE_FILE_TYPE,
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
  const aesKey = getRandom16ByteArray();

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

    payloads.push({
      key: COMMUNITY_LINKS_PAYLOAD_KEY,
      payload: new Blob([stringToUint8Array(JSON.stringify(linkPreviews))], {
        type: 'application/json',
      }),
      descriptorContent,
    });
  }

  for (let i = 0; files && i < files?.length; i++) {
    const payloadKey = `${COMMUNITY_MESSAGE_PAYLOAD_KEY}${i}`;
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

  if (!uploadResult) return null;

  if (
    recipients.some(
      (recipient) =>
        uploadResult.recipientStatus?.[recipient].toLowerCase() ===
        TransferUploadStatus.EnqueuedFailed
    )
  ) {
    message.fileId = uploadResult.file.fileId;
    message.fileMetadata.versionTag = uploadResult.newVersionTag;

    message.fileMetadata.appData.content.deliveryStatus = CommunityDeliveryStatus.Failed;
    message.fileMetadata.appData.content.deliveryDetails = {};
    for (const recipient of recipients) {
      message.fileMetadata.appData.content.deliveryDetails[recipient] =
        uploadResult.recipientStatus?.[recipient].toLowerCase() ===
        TransferUploadStatus.EnqueuedFailed
          ? CommunityDeliveryStatus.Failed
          : CommunityDeliveryStatus.Delivered;
    }

    await updateCommunityMessage(
      dotYouClient,
      communityId,
      message,
      recipients,
      uploadResult.keyHeader
    );

    console.error('Not all recipients received the message: ', uploadResult);
    throw new Error(`Not all recipients received the message: ${recipients.join(', ')}`);
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const updateCommunityMessage = async (
  dotYouClient: DotYouClient,
  communityId: string,
  message: HomebaseFile<CommunityMessage> | NewHomebaseFile<CommunityMessage>,
  recipients: string[],
  keyHeader?: KeyHeader
): Promise<UploadResult | void> => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const messageContent = message.fileMetadata.appData.content;
  const distribute = recipients?.length > 0;

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: targetDrive,
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
  };

  const payloadJson: string = jsonStringify64({ ...messageContent });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      groupId: message.fileMetadata.appData.groupId,
      archivalStatus: (message.fileMetadata.appData as AppFileMetaData<CommunityMessage>)
        .archivalStatus,
      previewThumbnail: message.fileMetadata.appData.previewThumbnail,
      fileType: COMMUNITY_MESSAGE_FILE_TYPE,
      content: payloadJson,
    },
    senderOdinId: (message.fileMetadata as FileMetadata<CommunityMessage>).senderOdinId,
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Connected,
    },
  };

  return await uploadHeader(
    dotYouClient,
    keyHeader || (message as HomebaseFile<CommunityMessage>).sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    async () => {
      const existingChatMessage = await getCommunityMessage(
        dotYouClient,
        communityId,
        message.fileMetadata.appData.uniqueId as string
      );
      if (!existingChatMessage) return;
      message.fileMetadata.versionTag = existingChatMessage.fileMetadata.versionTag;
      return await updateCommunityMessage(
        dotYouClient,
        communityId,
        message,
        recipients,
        keyHeader
      );
    }
  );
};

export const hardDeleteCommunityMessage = async (
  dotYouClient: DotYouClient,
  communityId: string,
  message: HomebaseFile<CommunityMessage>,
  recipients: string[]
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  return await deleteFile(dotYouClient, targetDrive, message.fileId, recipients);
};

export const getCommunityMessage = async (
  dotYouClient: DotYouClient,
  communityId: string,
  chatMessageId: string
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const fileHeader = await getFileHeaderByUniqueId<CommunityMessage>(
    dotYouClient,
    targetDrive,
    chatMessageId
  );
  if (!fileHeader) return null;

  return fileHeader;
};

export const getCommunityMessages = async (
  dotYouClient: DotYouClient,
  communityId: string,
  groupIds: string[] | undefined,
  tagIds: string[] | undefined,
  cursorState: string | undefined,
  pageSize: number
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [COMMUNITY_MESSAGE_FILE_TYPE],
    groupId: groupIds,
    tagsMatchAtLeastOne: tagIds,
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
          .map(async (result) => await dsrToMessage(dotYouClient, result, targetDrive, true))
          .filter(Boolean)
      )) as HomebaseFile<CommunityMessage>[]) || [],
  };
};

export const dsrToMessage = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityMessage> | null> => {
  try {
    const msgContent = await getContentFromHeaderOrPayload<CommunityMessage>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!msgContent) return null;

    if (
      (msgContent.deliveryStatus === CommunityDeliveryStatus.Sent ||
        msgContent.deliveryStatus === CommunityDeliveryStatus.Failed) &&
      dsr.serverMetadata?.transferHistory?.recipients
    ) {
      msgContent.deliveryDetails = buildDeliveryDetails(
        dsr.serverMetadata.transferHistory.recipients
      );
      msgContent.deliveryStatus = buildDeliveryStatus(msgContent.deliveryDetails);
    }

    const chatMessage: HomebaseFile<CommunityMessage> = {
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
    console.error('[community] failed to get the chatMessage payload of a dsr', dsr, ex);
    return null;
  }
};

const buildDeliveryDetails = (recipientTransferHistory: {
  [key: string]: RecipientTransferHistory;
}): Record<string, CommunityDeliveryStatus> => {
  const deliveryDetails: Record<string, CommunityDeliveryStatus> = {};

  for (const recipient of Object.keys(recipientTransferHistory)) {
    if (recipientTransferHistory[recipient].latestSuccessfullyDeliveredVersionTag) {
      if (recipientTransferHistory[recipient].isReadByRecipient) {
        deliveryDetails[recipient] = CommunityDeliveryStatus.Read;
      } else {
        deliveryDetails[recipient] = CommunityDeliveryStatus.Delivered;
      }
    } else {
      const latest = recipientTransferHistory[recipient].latestTransferStatus;
      const transferStatus =
        latest && typeof latest === 'string'
          ? (latest?.toLocaleLowerCase() as TransferStatus)
          : undefined;
      if (transferStatus && FailedTransferStatuses.includes(transferStatus)) {
        deliveryDetails[recipient] = CommunityDeliveryStatus.Failed;
      } else {
        deliveryDetails[recipient] = CommunityDeliveryStatus.Sent;
      }
    }
  }

  return deliveryDetails;
};

const buildDeliveryStatus = (
  deliveryDetails: Record<string, CommunityDeliveryStatus>
): CommunityDeliveryStatus => {
  const values = Object.values(deliveryDetails);
  // If any failed, the message is failed
  if (values.includes(CommunityDeliveryStatus.Failed)) return CommunityDeliveryStatus.Failed;
  if (values.every((val) => val === CommunityDeliveryStatus.Read))
    return CommunityDeliveryStatus.Read;
  // If all are delivered/read, the message is delivered/read
  if (
    values.every(
      (val) => val === CommunityDeliveryStatus.Delivered || val === CommunityDeliveryStatus.Read
    )
  )
    return CommunityDeliveryStatus.Delivered;

  // If it exists, it's sent
  return CommunityDeliveryStatus.Sent;
};
