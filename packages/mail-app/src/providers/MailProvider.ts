import {
  AppendResult,
  CursoredResult,
  DotYouClient,
  DriveSearchResult,
  EmbeddedThumb,
  FileQueryParams,
  GetBatchQueryResultOptions,
  NewDriveSearchResult,
  PayloadFile,
  RichText,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  TargetDrive,
  ThumbnailFile,
  TransferStatus,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
  appendDataToFile,
  getContentFromHeaderOrPayload,
  getFileHeader,
  getPayloadBytes,
  queryBatch,
  uploadFile,
  uploadHeader,
} from '@youfoundation/js-lib/core';
import { getNewId, jsonStringify64, makeGrid } from '@youfoundation/js-lib/helpers';
import { MediaFile, NewMediaFile } from '@youfoundation/js-lib/public';
import { appId } from '../hooks/auth/useAuth';
import { processVideoFile, createThumbnails } from '@youfoundation/js-lib/media';

export const MAIL_DRAFT_CONVERSATION_FILE_TYPE = 9001;
export const MAIL_CONVERSATION_FILE_TYPE = 9000;
export const MAIL_MESSAGE_PAYLOAD_KEY = 'mail_web';

export const DEFAULT_ARCHIVAL_STATUS = 0;
export const REMOVE_ARCHIVAL_STATUS = 2;
export const ARCHIVE_ARCHIVAL_STATUS = 1;

export interface MailConversation {
  originId: string; // Stored in content => The origin of the conversation; Created uniquely for each new conversation; And kept the same for each reply/forward
  threadId: string; // Stored in groupId => The thread of the conversation; Created uniquely for new conversations and forwards
  // uniqueId: string; // Stored in meta => The unique id of the conversation; Created uniquely for each message
  subject: string;
  message: RichText;
  sender: string; // Copy of the senderOdinId which is reset when the recipient marks the message as read
  recipients: string[];
  isRead?: boolean;

  forwardedMailThread?: DriveSearchResult<MailConversation>[];
}

export const MailDrive: TargetDrive = {
  alias: 'e69b5a48a663482fbfd846f3b0b143b0',
  type: '2dfecc40311e41e5a12455e925144202',
};

export interface MailConversationsReturn
  extends CursoredResult<DriveSearchResult<MailConversation>[]> {}

export const getMailConversations = async (
  dotYouClient: DotYouClient,
  cursorState: string | undefined,
  pageSize: number
): Promise<MailConversationsReturn> => {
  const params: FileQueryParams = {
    targetDrive: MailDrive,
    fileType: [MAIL_CONVERSATION_FILE_TYPE, MAIL_DRAFT_CONVERSATION_FILE_TYPE],
    // archivalStatus: [0],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  return {
    cursorState: response.cursorState,
    results: (await Promise.all(
      response.searchResults
        .map(async (result) => await dsrToMailConversation(dotYouClient, result, MailDrive, true))
        .filter(Boolean)
    )) as DriveSearchResult<MailConversation>[],
  };
};

export const getMailConversation = async (dotYouClient: DotYouClient, fileId: string) => {
  return await getFileHeader<MailConversation>(dotYouClient, MailDrive, fileId);
};

export interface MailThreadReturn extends CursoredResult<DriveSearchResult<MailConversation>[]> {}

export const getMailThread = async (
  dotYouClient: DotYouClient,
  threadId: string,
  cursorState: string | undefined,
  pageSize: number
): Promise<MailThreadReturn> => {
  const params: FileQueryParams = {
    targetDrive: MailDrive,
    fileType: [MAIL_CONVERSATION_FILE_TYPE, MAIL_DRAFT_CONVERSATION_FILE_TYPE],
    groupId: [threadId],
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
  };

  const response = await queryBatch(dotYouClient, params, ro);

  return {
    cursorState: response.cursorState,
    results: (await Promise.all(
      response.searchResults
        .map(async (result) => await dsrToMailConversation(dotYouClient, result, MailDrive, true))
        .filter(Boolean)
    )) as DriveSearchResult<MailConversation>[],
  };
};

export const uploadMail = async (
  dotYouClient: DotYouClient,
  conversation: NewDriveSearchResult<MailConversation> | DriveSearchResult<MailConversation>,
  files: (NewMediaFile | MediaFile)[] | undefined,
  onVersionConflict?: () => void
) => {
  const recipients = conversation.fileMetadata.appData.content.recipients;
  const distribute =
    recipients?.length > 0 &&
    conversation.fileMetadata.appData.fileType !== MAIL_DRAFT_CONVERSATION_FILE_TYPE;
  const anyExistingFiles = files?.some((file) => !('file' in file));

  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: MailDrive,
      overwriteFileId: conversation.fileId,
    },
    transitOptions: distribute
      ? {
          recipients: [...recipients],
          schedule: ScheduleOptions.SendNowAwaitResponse,
          sendContents: SendContents.All,
          useGlobalTransitId: true,
          useAppNotification: true,
          appNotificationOptions: {
            appId: appId,
            typeId: conversation.fileMetadata.appData.uniqueId as string,
            tagId: getNewId(),
            silent: false,
          },
        }
      : undefined,
  };

  const conversationContent = conversation.fileMetadata.appData.content;

  //TODO: Should we move an overload of content to a payload?
  const payloadJson: string = jsonStringify64({ ...conversationContent });

  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: distribute,
    appData: {
      ...conversation.fileMetadata.appData,
      fileType: conversation.fileMetadata.appData.fileType || MAIL_CONVERSATION_FILE_TYPE,
      content: payloadJson,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];

  for (let i = 0; files && i < files?.length; i++) {
    let newMediaFile = files[i];
    const payloadKey = newMediaFile.key || `${MAIL_MESSAGE_PAYLOAD_KEY}${i}`;

    if (!('file' in newMediaFile)) {
      // We ignore existing files when not distributing as they are just kept
      if (!distribute) continue;

      // TODO: Is there a better way to handle this case?
      // Fetch the file from the server
      const payloadFromServer = await getPayloadBytes(
        dotYouClient,
        MailDrive,
        newMediaFile.fileId || (conversation.fileId as string),
        payloadKey
      );

      if (!payloadFromServer) continue;
      const existingFile: NewMediaFile = {
        key: payloadKey,
        file: new Blob([payloadFromServer.bytes], { type: payloadFromServer.contentType }),
      };

      newMediaFile = existingFile;
    }

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

  const uploadResult: AppendResult | UploadResult | null = await (async () => {
    if (!distribute && anyExistingFiles && 'sharedSecretEncryptedKeyHeader' in conversation) {
      const headerUploadResult = await uploadHeader(
        dotYouClient,
        conversation.sharedSecretEncryptedKeyHeader,
        uploadInstructions,
        uploadMetadata,
        onVersionConflict
      );
      if (!headerUploadResult) return null;
      if (payloads.length) {
        const uploadResult = await appendDataToFile(
          dotYouClient,
          conversation.sharedSecretEncryptedKeyHeader,
          {
            targetFile: {
              fileId: conversation.fileId as string,
              targetDrive: MailDrive,
            },
            versionTag: headerUploadResult.newVersionTag,
          },
          payloads,
          thumbnails,
          onVersionConflict
        );
        return { ...uploadResult, file: { fileId: conversation.fileId } };
      } else {
        return headerUploadResult;
      }
    }

    const uploadResult = await uploadFile(
      dotYouClient,
      uploadInstructions,
      uploadMetadata,
      payloads,
      thumbnails,
      true,
      onVersionConflict
    );

    return uploadResult || null;
  })();

  if (!uploadResult) return null;

  if (distribute) {
    const allDelivered = recipients.map(
      (recipient) =>
        (uploadResult as UploadResult).recipientStatus?.[recipient].toLowerCase() ===
        TransferStatus.DeliveredToInbox
    );

    // TODO: Should this work differently with the job system? Would it auto retry?
    if (!allDelivered.every((delivered) => delivered)) {
      console.error('Not all recipients received the message: ', uploadResult);
      throw new Error(`Not all recipients received the message: ${recipients.join(', ')}`);
    }
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const updateLocalMailHeader = async (
  dotYouClient: DotYouClient,
  conversation: DriveSearchResult<MailConversation>,
  onVersionConflict?: () => void
) => {
  const uploadInstructions: UploadInstructionSet = {
    storageOptions: {
      drive: MailDrive,
      overwriteFileId: conversation.fileId,
    },
  };

  const conversationContent = conversation.fileMetadata.appData.content;

  //TODO: Should we move an excess of content to a payload?
  const payloadJson: string = jsonStringify64({ ...conversationContent });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: conversation?.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      ...conversation.fileMetadata.appData,
      fileType: conversation.fileMetadata.appData.fileType || MAIL_CONVERSATION_FILE_TYPE,
      content: payloadJson,
    },
    isEncrypted: true,
    accessControlList: conversation.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
  };

  return await uploadHeader(
    dotYouClient,
    conversation.sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    onVersionConflict
  );
};

export const dsrToMailConversation = async (
  dotYouClient: DotYouClient,
  dsr: DriveSearchResult,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<DriveSearchResult<MailConversation> | null> => {
  try {
    const attrContent = await getContentFromHeaderOrPayload<MailConversation>(
      dotYouClient,
      targetDrive,
      dsr,
      includeMetadataHeader
    );
    if (!attrContent) return null;

    const conversation: DriveSearchResult<MailConversation> = {
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

export const getAllRecipients = (
  conversation: DriveSearchResult<MailConversation>,
  identity?: string
): string[] => {
  if (!conversation?.fileMetadata?.appData?.content?.recipients) return [];

  const recipients = conversation.fileMetadata.appData.content.recipients;
  const sender =
    conversation.fileMetadata.senderOdinId || conversation.fileMetadata.appData.content.sender;

  return [...recipients, sender].filter((recipient) => recipient && recipient !== identity);
};
