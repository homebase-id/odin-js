import {
  CursoredResult,
  DotYouClient,
  HomebaseFile,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewHomebaseFile,
  PayloadFile,
  RichText,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  ThumbnailFile,
  TransferUploadStatus,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
  getContentFromHeaderOrPayload,
  getFileHeader,
  queryBatch,
  uploadFile,
  MediaFile,
  NewMediaFile,
  PriorityOptions,
  TransferStatus,
  FailedTransferStatuses,
  RecipientTransferHistory,
  DEFAULT_PAYLOAD_KEY,
  patchFile,
  UpdateInstructionSet,
  GenerateKeyHeader,
  decryptKeyHeader,
  MAX_HEADER_CONTENT_BYTES,
} from '@homebase-id/js-lib/core';
import {
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  makeGrid,
  stringToUint8Array,
  getPayloadsAndThumbnailsForNewMedia,
} from '@homebase-id/js-lib/helpers';
import { appId } from '../hooks/auth/useAuth';
import { getPlainTextFromRichText } from '@homebase-id/common-app';

export const MAIL_DRAFT_CONVERSATION_FILE_TYPE = 9001;
export const MAIL_CONVERSATION_FILE_TYPE = 9000;
export const MAIL_MESSAGE_PAYLOAD_KEY = 'mail_web';

export const DEFAULT_ARCHIVAL_STATUS = 0;
export const REMOVE_ARCHIVAL_STATUS = 2;
export const ARCHIVE_ARCHIVAL_STATUS = 1;

export enum MailDeliveryStatus {
  NotSent = 10, // Draft state
  Sending = 15, // When it's sending; Used for optimistic updates

  Sent = 20, // when delivered to your identity
  Delivered = 30, // when delivered to the recipient inbox
  // Read = 40, // Not supported, we don't want read receipts on mail
  Failed = 50, // when the message failed to send to the recipient
}

export interface MailConversation {
  originId: string; // Stored in content => The origin of the conversation; Created uniquely for each new conversation; And kept the same for each reply/forward
  threadId: string; // Stored in groupId => The thread of the conversation; Created uniquely for new conversations and forwards
  // uniqueId: string; // Stored in meta => The unique id of the conversation; Created uniquely for each message
  subject: string;
  message: RichText;
  plainMessage?: string; // Used purely for search purposes
  plainAttachment?: string; // Used purely for search purposes

  sender: string; // Copy of the senderOdinId which is reset when the recipient marks the message as read => TODO: Remove this in favor of the fileMetadata.originalAuthor
  recipients: string[];
  isRead?: boolean;

  forwardedMailThread?: HomebaseFile<MailConversation>[];

  /// DeliveryStatus of the message. Indicates if the message is sent, delivered or read
  deliveryStatus: MailDeliveryStatus;
  deliveryDetails?: Record<string, MailDeliveryStatus>;
}

export const MailDrive: TargetDrive = {
  alias: 'e69b5a48a663482fbfd846f3b0b143b0',
  type: '2dfecc40311e41e5a12455e925144202',
};

export type MailConversationsReturn = CursoredResult<HomebaseFile<MailConversation>[]>;

export const getMailConversations = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined,
  threadId: string | undefined,
  pageSize: number
): Promise<MailConversationsReturn> => {
  const params: FileQueryParams = {
    targetDrive: MailDrive,
    fileType: [MAIL_CONVERSATION_FILE_TYPE, MAIL_DRAFT_CONVERSATION_FILE_TYPE],
    groupId: threadId ? [threadId] : undefined,
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
    includeTransferHistory: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  return {
    cursorState: response.cursorState,
    results: (await Promise.all(
      response.searchResults
        .map(async (result) => await dsrToMailConversation(dotYouClient, result, MailDrive, true))
        .filter(Boolean)
    )) as HomebaseFile<MailConversation>[],
  };
};

export const getMailConversation = async (dotYouClient: DotYouClient, fileId: string) => {
  const header = await getFileHeader<string>(dotYouClient, MailDrive, fileId, {
    decrypt: false,
  });
  if (!header) return null;

  return await dsrToMailConversation(dotYouClient, header, MailDrive, true);
};

export const uploadMail = async (
  dotYouClient: DotYouClient,
  conversation: NewHomebaseFile<MailConversation>,
  newMediaFiles: NewMediaFile[] | undefined,
  onVersionConflict?: () => void
) => {
  const identity = dotYouClient.getHostIdentity();
  const recipients = conversation.fileMetadata.appData.content.recipients.filter(
    (recipient) => recipient !== identity
  );
  const distribute =
    recipients?.length > 0 &&
    conversation.fileMetadata.appData.fileType !== MAIL_DRAFT_CONVERSATION_FILE_TYPE;

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

  const encryptedKeyHeader = conversation.sharedSecretEncryptedKeyHeader || GenerateKeyHeader();
  const decryptedKeyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : undefined;

  const aesKey = decryptedKeyHeader?.aesKey || getRandom16ByteArray();

  const {
    payloads: newMediaPayloads,
    thumbnails: newMediaThumbnails,
    previewThumbnails,
  } = await getPayloadsAndThumbnailsForNewMedia(newMediaFiles || [], aesKey, {
    keyPrefix: MAIL_MESSAGE_PAYLOAD_KEY,
  });

  payloads.push(...newMediaPayloads);
  thumbnails.push(...newMediaThumbnails);

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: MailDrive,
      overwriteFileId: conversation.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: recipients,
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.Medium,
          sendContents: SendContents.All,
          useAppNotification: true,
          appNotificationOptions: {
            appId: appId,
            typeId: conversation.fileMetadata.appData.groupId || getNewId(),
            tagId: conversation.fileMetadata.appData.uniqueId || getNewId(),
            silent: false,
          },
        }
      : undefined,
  };

  const payloadJson: string = jsonStringify64({ ...conversation.fileMetadata.appData.content });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < MAX_HEADER_CONTENT_BYTES;

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      ...conversation.fileMetadata.appData,
      fileType: conversation.fileMetadata.appData.fileType || MAIL_CONVERSATION_FILE_TYPE,
      content: shouldEmbedContent ? payloadJson : undefined,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  uploadMetadata.appData.previewThumbnail =
    previewThumbnails.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
    });
  }

  const uploadResult = await uploadFile(
    dotYouClient,
    uploadInstructions,
    uploadMetadata,
    payloads,
    thumbnails,
    true,
    onVersionConflict,
    {
      aesKey,
    }
  );

  if (!uploadResult) return null;

  conversation.fileId = conversation.fileId || (uploadResult as UploadResult).file.fileId;
  conversation.fileMetadata.versionTag = uploadResult.newVersionTag;
  conversation.fileMetadata.appData.previewThumbnail = uploadMetadata.appData.previewThumbnail;
  // We force set the keyHeader as it's returned from the upload, and needed for fast saves afterwards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversation.sharedSecretEncryptedKeyHeader = uploadResult.keyHeader as any;

  if (distribute) {
    if (
      recipients.some(
        (recipient) =>
          (uploadResult as UploadResult).recipientStatus?.[recipient].toLowerCase() ===
          TransferUploadStatus.EnqueuedFailed
      )
    ) {
      conversation.fileId = (uploadResult as UploadResult).file.fileId;
      conversation.fileMetadata.versionTag = uploadResult.newVersionTag;

      conversation.fileMetadata.appData.content.deliveryStatus = MailDeliveryStatus.Failed;
      conversation.fileMetadata.appData.content.deliveryDetails = {};
      for (const recipient of recipients) {
        conversation.fileMetadata.appData.content.deliveryDetails[recipient] =
          (uploadResult as UploadResult).recipientStatus?.[recipient].toLowerCase() ===
          TransferUploadStatus.DeliveredToInbox
            ? MailDeliveryStatus.Delivered
            : MailDeliveryStatus.Failed;
      }

      await updateMail(
        dotYouClient,
        conversation as HomebaseFile<MailConversation>,
        payloads.map((pyld) => {
          return {
            key: pyld.key,
            contentType: pyld.payload.type,
          };
        }),
        undefined
      );

      console.error('Not all recipients received the message: ', uploadResult);
      throw new Error(`Not all recipients received the message: ${recipients.join(', ')}`);
    }
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const updateMail = async (
  dotYouClient: DotYouClient,
  conversation: HomebaseFile<MailConversation>,
  existingAndNewMediaFiles?: (NewMediaFile | MediaFile)[],
  onVersionConflict?: () => void
) => {
  const identity = dotYouClient.getHostIdentity();
  const recipients = conversation.fileMetadata.appData.content.recipients.filter(
    (recipient) => recipient !== identity
  );
  const distribute =
    recipients?.length > 0 &&
    conversation.fileMetadata.appData.fileType !== MAIL_DRAFT_CONVERSATION_FILE_TYPE;

  const uploadInstructions: UpdateInstructionSet = {
    storageOptions: {
      drive: MailDrive,
      overwriteFileId: conversation.fileId,
    },
    locale: 'local',
    file: {
      fileId: conversation.fileId,
      targetDrive: MailDrive,
    },
    versionTag: conversation.fileMetadata.versionTag,
    transitOptions: distribute
      ? {
          recipients: recipients,
          schedule: ScheduleOptions.SendLater,
          priority: PriorityOptions.Medium,
          sendContents: SendContents.All,
          useAppNotification: true,
          appNotificationOptions: {
            appId: appId,
            typeId: conversation.fileMetadata.appData.groupId || getNewId(),
            tagId: conversation.fileMetadata.appData.uniqueId || getNewId(),
            silent: false,
          },
        }
      : undefined,
    recipients: distribute ? recipients : undefined,
  };
  const conversationContent = conversation.fileMetadata.appData.content;

  const payloadJson: string = jsonStringify64({ ...conversationContent });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metedata
  const shouldEmbedContent = payloadBytes.length < MAX_HEADER_CONTENT_BYTES;

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      ...conversation.fileMetadata.appData,
      fileType: conversation.fileMetadata.appData.fileType || MAIL_CONVERSATION_FILE_TYPE,
      content: shouldEmbedContent ? payloadJson : undefined,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  const existingMediaFiles =
    conversation.fileMetadata.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY) || [];

  const newMediaFiles: NewMediaFile[] =
    (existingAndNewMediaFiles?.filter(
      (f) => 'file' in f && f.file instanceof Blob
    ) as NewMediaFile[]) || [];

  // Discover deleted files:
  const toDeletePayloads: { key: string }[] = [];
  for (let i = 0; existingMediaFiles && i < existingMediaFiles?.length; i++) {
    const existingMediaFile = existingMediaFiles[i];
    if (!existingAndNewMediaFiles?.find((f) => f.key === existingMediaFile.key)) {
      toDeletePayloads.push({ key: existingMediaFile.key });
    }
  }

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

  const encryptedKeyHeader = conversation.sharedSecretEncryptedKeyHeader || GenerateKeyHeader();

  // decrypt keyheader;
  const decryptedKeyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : undefined;

  const { payloads: newMediaPayloads, thumbnails: newMediaThumbnails } =
    await getPayloadsAndThumbnailsForNewMedia(newMediaFiles || [], decryptedKeyHeader?.aesKey, {
      keyPrefix: MAIL_MESSAGE_PAYLOAD_KEY,
      keyIndex: conversation.fileMetadata.payloads?.length,
    });

  payloads.push(...newMediaPayloads);
  thumbnails.push(...newMediaThumbnails);

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
      iv: getRandom16ByteArray(),
    });
  } else {
    if (conversation.fileMetadata?.payloads?.some((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)) {
      toDeletePayloads.push({
        key: DEFAULT_PAYLOAD_KEY,
      });
    }
  }

  const patchResult = await patchFile(
    dotYouClient,
    conversation.sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    payloads,
    thumbnails,
    toDeletePayloads,
    onVersionConflict
  );

  if (!patchResult) return null;

  return {
    ...patchResult,
    file: {
      fileId: conversation.fileId,
      globalTransitId: conversation.fileMetadata.appData.groupId,
    },
    newVersionTag: patchResult.newVersionTag,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const dsrToMailConversation = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<MailConversation> | null> => {
  try {
    const mailContent = await getContentFromHeaderOrPayload<MailConversation>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!mailContent) return null;

    if (
      mailContent.deliveryStatus === MailDeliveryStatus.Sent &&
      dsr.serverMetadata?.transferHistory?.recipients
    ) {
      mailContent.deliveryDetails = buildDeliveryDetails(
        dsr.serverMetadata.transferHistory.recipients
      );
      mailContent.deliveryStatus = buildDeliveryStatus(mailContent.deliveryDetails);
    }

    const conversation: HomebaseFile<MailConversation> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: {
            ...mailContent,
            plainMessage: getPlainTextFromRichText(mailContent.message),
            plainAttachment: dsr.fileMetadata.payloads
              ?.map((payload) => payload.descriptorContent)
              ?.join(' '),
          },
        },
      },
    };

    return conversation;
  } catch (ex) {
    console.error('[mail] failed to get the conversation payload of a dsr', dsr, ex);
    return null;
  }
};

const buildDeliveryDetails = (recipientTransferHistory: {
  [key: string]: RecipientTransferHistory;
}): Record<string, MailDeliveryStatus> => {
  const deliveryDetails: Record<string, MailDeliveryStatus> = {};

  for (const recipient of Object.keys(recipientTransferHistory)) {
    if (recipientTransferHistory[recipient].latestSuccessfullyDeliveredVersionTag) {
      // if (recipientTransferHistory[recipient].isReadByRecipient) {
      //   deliveryDetails[recipient] = MailDeliveryStatus.Read;
      // } else {
      deliveryDetails[recipient] = MailDeliveryStatus.Delivered;
      // }
    } else {
      const latest = recipientTransferHistory[recipient].latestTransferStatus;
      const transferStatus =
        latest && typeof latest === 'string'
          ? (latest?.toLocaleLowerCase() as TransferStatus)
          : undefined;
      if (transferStatus && FailedTransferStatuses.includes(transferStatus)) {
        deliveryDetails[recipient] = MailDeliveryStatus.Failed;
      } else {
        deliveryDetails[recipient] = MailDeliveryStatus.Sent;
      }
    }
  }

  return deliveryDetails;
};

const buildDeliveryStatus = (
  deliveryDetails: Record<string, MailDeliveryStatus>
): MailDeliveryStatus => {
  const values = Object.values(deliveryDetails);
  // If any failed, the message is failed
  if (values.includes(MailDeliveryStatus.Failed)) return MailDeliveryStatus.Failed;
  // If all are delivered, the message is delivered
  if (values.every((val) => val === MailDeliveryStatus.Delivered))
    return MailDeliveryStatus.Delivered;

  // If it exists, it's sent
  return MailDeliveryStatus.Sent;
};

export const getAllRecipients = (
  conversation: HomebaseFile<MailConversation>,
  identity?: string
): string[] => {
  if (!conversation?.fileMetadata?.appData?.content?.recipients) return [];

  const sender =
    conversation.fileMetadata.senderOdinId || conversation.fileMetadata.appData.content.sender;
  const recipients = [...conversation.fileMetadata.appData.content.recipients, sender];

  const fromMeToMe = recipients.every(
    (recipient) => recipient && identity && recipient === identity
  );
  if (fromMeToMe && identity) return [identity];

  return recipients.filter((recipient) => recipient && recipient !== identity);
};
