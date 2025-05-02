import {
  OdinClient,
  NewHomebaseFile,
  NewMediaFile,
  UploadInstructionSet,
  UploadFileMetadata,
  SecurityGroupType,
  PayloadFile,
  ThumbnailFile,
  EmbeddedThumb,
  uploadFile,
  HomebaseFile,
  KeyHeader,
  UploadResult,
  AppFileMetaData,
  getFileHeaderByUniqueId,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
  getContentFromHeader,
  queryBatch,
  deleteFile,
  RichText,
  TransferUploadStatus,
  SystemFileType,
  GlobalTransitIdFileIdentifier,
  DEFAULT_PAYLOAD_KEY,
  patchFile,
  UpdateInstructionSet,
  UpdateResult,
  getContentFromHeaderOrPayload,
} from '@homebase-id/js-lib/core';
import {
  jsonStringify64,
  stringToUint8Array,
  makeGrid,
  getRandom16ByteArray,
  toGuidId,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import {
  LinkPreview,
  LinkPreviewDescriptor,
  processVideoFile,
  createThumbnails,
} from '@homebase-id/js-lib/media';
import { CommunityDefinition, getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';
import {
  deleteFileOverPeer,
  getContentFromHeaderOrPayloadOverPeer,
  getContentFromHeaderOverPeer,
  getFileHeaderOverPeerByUniqueId,
  queryBatchOverPeer,
  TransitInstructionSet,
  TransitUploadResult,
  uploadFileOverPeer,
} from '@homebase-id/js-lib/peer';
import { COMMUNITY_APP_ID, ellipsisAtMaxCharOfRichText } from '@homebase-id/common-app';

export const COMMUNITY_MESSAGE_FILE_TYPE = 7020;
export const CommunityDeletedArchivalStaus = 2;

const COMMUNITY_MESSAGE_PAYLOAD_KEY = 'comm_web';
export const COMMUNITY_LINKS_PAYLOAD_KEY = 'comm_links';
export const COMMUNITY_PINNED_TAG = toGuidId('pinned-message');
export const MESSAGE_CHARACTERS_LIMIT = 1600;

export enum CommunityDeliveryStatus {
  Sending = 15, // When it's sending; Used for optimistic updates
  Sent = 20, // when delivered to the central identity
  Failed = 50, // when the message failed to send to the recipient
}

export interface CommunityMessage {
  isCollaborative?: boolean;
  collaborators?: string[];

  /// Content of the message
  message: RichText | undefined;

  /// DeliveryStatus of the message. Indicates if the message is sent and/or delivered
  deliveryStatus: CommunityDeliveryStatus;

  channelId: string;
  threadId?: string;

  /// lastEdited by Identity of the message
  lastEditedBy?: string;
}

export const uploadCommunityMessage = async (
  odinClient: OdinClient,
  community: HomebaseFile<CommunityDefinition>,
  message: NewHomebaseFile<CommunityMessage>,
  files: NewMediaFile[] | undefined,
  linkPreviews: LinkPreview[] | undefined,
  referencedFile?: GlobalTransitIdFileIdentifier,
  notificationRecipients?: string[],
  onVersionConflict?: () => void
) => {
  const communityId = community.fileMetadata.appData.uniqueId as string;
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const messageContent = message.fileMetadata.appData.content;

  const payloadJson: string = jsonStringify64({ ...messageContent });
  const payloadBytes = stringToUint8Array(payloadJson);

  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MESSAGE_CHARACTERS_LIMIT * 4; // 4 bytes per character
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: true,
    referencedFile,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      groupId: !referencedFile ? message.fileMetadata.appData.groupId : undefined,
      userDate: message.fileMetadata.appData.userDate,
      tags: message.fileMetadata.appData.tags,
      fileType: COMMUNITY_MESSAGE_FILE_TYPE,
      content: shouldEmbedContent
        ? payloadJson
        : jsonStringify64({
          ...messageContent,
          message: ellipsisAtMaxCharOfRichText(
            messageContent.message,
            Math.round(MESSAGE_CHARACTERS_LIMIT * 0.75)
          ),
        }),
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList ||
      community.fileMetadata.appData.content.acl || {
      requiredSecurityGroup: SecurityGroupType.AutoConnected,
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

  const identity = odinClient.getLoggedInIdentity();
  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
    });
  }

  let uploadResult: UploadResult | TransitUploadResult | void;
  if (
    community.fileMetadata.senderOdinId &&
    community.fileMetadata.senderOdinId !== odinClient.getHostIdentity()
  ) {
    const transitInstructions: TransitInstructionSet = {
      remoteTargetDrive: targetDrive,
      overwriteGlobalTransitFileId: message.fileMetadata.globalTransitId,
      transferIv: getRandom16ByteArray(),
      recipients: [community.fileMetadata.senderOdinId],
      systemFileType: message.fileSystemType,
      notificationOptions: {
        appId: COMMUNITY_APP_ID,
        tagId: message.fileMetadata.appData.uniqueId as string,
        typeId: communityId,
        peerSubscriptionId: communityId,
        unEncryptedMessage: `New message from ${identity} in ${community.fileMetadata.appData.content.title}`,
        recipients: (
          notificationRecipients || community.fileMetadata.appData.content.members
        ).filter((recipient) => recipient !== identity),
        silent: false,
      },
    };

    uploadResult = await uploadFileOverPeer(
      odinClient,
      transitInstructions,
      uploadMetadata,
      payloads,
      thumbnails,
      undefined,
      {
        aesKey,
      }
    );
  } else {
    const uploadInstructions: UploadInstructionSet = {
      storageOptions: {
        drive: targetDrive,
      },
      systemFileType: message.fileSystemType,
      transitOptions: notificationRecipients
        ? {
          useAppNotification: true,
          appNotificationOptions: {
            appId: COMMUNITY_APP_ID,
            tagId: message.fileMetadata.appData.uniqueId as string,
            typeId: communityId,
            peerSubscriptionId: communityId,
            unEncryptedMessage: `New message from ${identity} in "${community.fileMetadata.appData.content.title}"`,
            recipients: notificationRecipients.filter((recipient) => recipient !== identity),
            silent: false,
          },
        }
        : undefined,
    };

    uploadResult = await uploadFile(
      odinClient,
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
  }

  if (!uploadResult) return null;

  if ('file' in uploadResult) {
    message.fileId = uploadResult.file.fileId;
    message.fileMetadata.versionTag = uploadResult.newVersionTag;
  } else {
    message.fileMetadata.globalTransitId =
      uploadResult.remoteGlobalTransitIdFileIdentifier.globalTransitId;
  }

  const recipientStatus = uploadResult.recipientStatus;
  if (
    recipientStatus &&
    Object.values(recipientStatus).some(
      (status) => status.toString().toLowerCase() === TransferUploadStatus.EnqueuedFailed
    )
  ) {
    message.fileMetadata.appData.content.deliveryStatus = CommunityDeliveryStatus.Failed;
    await updateCommunityMessage(
      odinClient,
      community,
      message as HomebaseFile<CommunityMessage>,
      'keyHeader' in uploadResult ? uploadResult.keyHeader : undefined
    );
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const BACKEDUP_PAYLOAD_KEY = 'bckp_key';

export const updateCommunityMessage = async (
  odinClient: OdinClient,
  community: HomebaseFile<CommunityDefinition>,
  message: HomebaseFile<CommunityMessage>,
  keyHeader?: KeyHeader,
  storeBackup?: boolean
): Promise<void | UploadResult | UpdateResult> => {
  const communityId = community.fileMetadata.appData.uniqueId as string;
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const messageContent = message.fileMetadata.appData.content;

  const payloadJson: string = jsonStringify64({ ...messageContent });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 1600 chars for content
  const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MESSAGE_CHARACTERS_LIMIT * 4;

  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: true,
    referencedFile:
      message.fileSystemType.toLocaleLowerCase() === 'comment'
        ? {
          targetDrive,
          globalTransitId: message.fileMetadata.appData.groupId as string,
        }
        : undefined,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      tags: message.fileMetadata.appData.tags,
      groupId:
        message.fileSystemType.toLocaleLowerCase() === 'comment'
          ? undefined
          : message.fileMetadata.appData.groupId,
      archivalStatus: (message.fileMetadata.appData as AppFileMetaData<CommunityMessage>)
        .archivalStatus,
      previewThumbnail: message.fileMetadata.appData.previewThumbnail,
      fileType: COMMUNITY_MESSAGE_FILE_TYPE,
      content: shouldEmbedContent
        ? payloadJson
        : jsonStringify64({
          ...messageContent,
          message: ellipsisAtMaxCharOfRichText(
            messageContent.message,
            Math.round(MESSAGE_CHARACTERS_LIMIT * 0.75)
          ),
        }),
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList ||
      community.fileMetadata.appData.content.acl || {
      requiredSecurityGroup: SecurityGroupType.AutoConnected,
    },
  };

  const encryptedKeyHeader = message.sharedSecretEncryptedKeyHeader;
  const odinId = community.fileMetadata.senderOdinId;
  const instructionSet: UpdateInstructionSet =
    odinId && odinId !== odinClient.getHostIdentity()
      ? {
        transferIv: getRandom16ByteArray(),
        locale: 'peer',
        file: {
          globalTransitId: message.fileMetadata.globalTransitId as string,
          targetDrive,
        },
        versionTag: message.fileMetadata.versionTag,
        recipients: [odinId],
        systemFileType: message.fileSystemType,
      }
      : {
        transferIv: getRandom16ByteArray(),
        locale: 'local',
        file: {
          fileId: message.fileId,
          targetDrive,
        },
        versionTag: message.fileMetadata.versionTag,
        systemFileType: message.fileSystemType,
      };

  const payloads: PayloadFile[] = [];
  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
      iv: getRandom16ByteArray(),
    });
  }

  if (storeBackup) {
    payloads.push({
      key: BACKEDUP_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
      iv: getRandom16ByteArray(),
    });
  }

  const updateResult = await patchFile(
    odinClient,
    encryptedKeyHeader,
    instructionSet,
    uploadMetadata,
    payloads,
    undefined,
    undefined,
    async () => {
      const existingChatMessage = await getCommunityMessage(
        odinClient,
        community.fileMetadata.senderOdinId,
        communityId,
        message.fileMetadata.appData.uniqueId as string
      );
      if (!existingChatMessage) return;
      message.fileMetadata.versionTag = existingChatMessage.fileMetadata.versionTag;
      return await updateCommunityMessage(odinClient, community, message, keyHeader);
    }
  );

  return updateResult;
};

export const hardDeleteCommunityMessage = async (
  odinClient: OdinClient,
  odinId: string,
  communityId: string,
  message: HomebaseFile<CommunityMessage>
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  if (odinId !== odinClient.getHostIdentity()) {
    if (!message.fileMetadata.globalTransitId) {
      throw new Error('Global Transit Id is required for hard delete over peer');
    }
    return await deleteFileOverPeer(
      odinClient,
      targetDrive,
      message.fileMetadata.globalTransitId,
      [odinId],
      message.fileSystemType
    );
  }

  return await deleteFile(
    odinClient,
    targetDrive,
    message.fileId,
    undefined,
    message.fileSystemType
  );
};

export const getCommunityMessage = async (
  odinClient: OdinClient,
  odinId: string,
  communityId: string,
  chatMessageId: string,
  systemFileType?: SystemFileType
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);

  const fileHeader =
    odinId !== odinClient.getHostIdentity()
      ? await getFileHeaderOverPeerByUniqueId<string>(
        odinClient,
        odinId,
        targetDrive,
        chatMessageId,
        {
          decrypt: true,
          systemFileType,
        }
      )
      : await getFileHeaderByUniqueId<string>(odinClient, targetDrive, chatMessageId, {
        decrypt: true,
        systemFileType,
      });

  if (!fileHeader) return null;

  return await dsrToMessage(odinClient, fileHeader, odinId, targetDrive, true);
};

export const getCommunityMessages = async (
  odinClient: OdinClient,
  odinId: string,
  communityId: string,
  groupIds: string[] | undefined,
  tagIds: string[] | undefined,
  cursorState: string | undefined,
  pageSize: number,
  systemFileType?: SystemFileType
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const params: FileQueryParams = {
    targetDrive: targetDrive,
    fileType: [COMMUNITY_MESSAGE_FILE_TYPE],
    groupId: groupIds,
    tagsMatchAtLeastOne: tagIds,
    systemFileType,
  };

  const ro: GetBatchQueryResultOptions = {
    maxRecords: pageSize,
    cursorState: cursorState,
    includeMetadataHeader: true,
    includeTransferHistory: false,
  };

  const response =
    odinId && odinId !== odinClient.getHostIdentity()
      ? await queryBatchOverPeer(odinClient, odinId, params, ro)
      : await queryBatch(odinClient, params, ro);
  return {
    ...response,
    searchResults:
      ((await Promise.all(
        response.searchResults
          .map(
            async (result) => await dsrToMessage(odinClient, result, odinId, targetDrive, true)
          )
          .filter(Boolean)
      )) as HomebaseFile<CommunityMessage>[]) || [],
  };
};

export const dsrToMessage = async (
  odinClient: OdinClient,
  dsr: HomebaseFile,
  odinId: string | undefined,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityMessage> | null> => {
  try {
    const msgContent = await (async () => {
      // Only here for backwards compatibility; Can be removed once Community is pushed live for all on production
      const hasPartialOrFullContent = !!dsr.fileMetadata.appData.content?.length;
      if (hasPartialOrFullContent)
        return odinId && odinClient.getHostIdentity() !== odinId
          ? await getContentFromHeaderOverPeer<CommunityMessage>(
            odinClient,
            odinId,
            targetDrive,
            dsr,
            includeMetadataHeader,
            dsr.fileSystemType
          )
          : await getContentFromHeader<CommunityMessage>(
            odinClient,
            targetDrive,
            dsr,
            includeMetadataHeader,
            dsr.fileSystemType
          );
      else
        return odinId && odinClient.getHostIdentity() !== odinId
          ? await getContentFromHeaderOrPayloadOverPeer<CommunityMessage>(
            odinClient,
            odinId,
            targetDrive,
            dsr,
            includeMetadataHeader,
            dsr.fileSystemType
          )
          : await getContentFromHeaderOrPayload<CommunityMessage>(
            odinClient,
            targetDrive,
            dsr,
            includeMetadataHeader,
            dsr.fileSystemType
          );
    })();

    if (!msgContent) return null;

    const chatMessage: HomebaseFile<CommunityMessage> = {
      ...dsr,
      fileMetadata: {
        ...dsr.fileMetadata,
        appData: {
          ...dsr.fileMetadata.appData,
          content: { ...msgContent, deliveryStatus: CommunityDeliveryStatus.Sent },
        },
      },
    };

    return chatMessage;
  } catch (ex) {
    console.error('[community] failed to get the chatMessage payload of a dsr', dsr, ex);
    return null;
  }
};
