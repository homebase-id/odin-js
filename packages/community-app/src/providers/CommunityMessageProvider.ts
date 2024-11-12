import {
  DotYouClient,
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
  uploadHeader,
  getFileHeaderByUniqueId,
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
  getContentFromHeaderOrPayload,
  queryBatch,
  deleteFile,
  RichText,
  UpdateHeaderInstructionSet,
  TransferUploadStatus,
  SystemFileType,
  GlobalTransitIdFileIdentifier,
} from '@homebase-id/js-lib/core';
import {
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
import { CommunityDefinition, getTargetDriveFromCommunityId } from './CommunityDefinitionProvider';
import {
  deleteFileOverPeer,
  getContentFromHeaderOrPayloadOverPeer,
  getFileHeaderOverPeerByUniqueId,
  queryBatchOverPeer,
  TransitInstructionSet,
  TransitUploadResult,
  uploadFileOverPeer,
} from '@homebase-id/js-lib/peer';
import { COMMUNITY_APP_ID } from '@homebase-id/common-app';

export const COMMUNITY_MESSAGE_FILE_TYPE = 7020;
export const CommunityDeletedArchivalStaus = 2;

const COMMUNITY_MESSAGE_PAYLOAD_KEY = 'comm_web';
export const COMMUNITY_LINKS_PAYLOAD_KEY = 'comm_links';

export enum CommunityDeliveryStatus {
  Sending = 15, // When it's sending; Used for optimistic updates
  Sent = 20, // when delivered to the central identity
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

  channelId: string;
  threadId?: string;
}

export const uploadCommunityMessage = async (
  dotYouClient: DotYouClient,
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

  const jsonContent: string = jsonStringify64({ ...messageContent });
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
      content: jsonContent,
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

  const identity = dotYouClient.getIdentity();
  let uploadResult: UploadResult | TransitUploadResult | void;
  if (
    community.fileMetadata.senderOdinId &&
    community.fileMetadata.senderOdinId !== dotYouClient.getIdentity()
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
        recipients: (
          notificationRecipients || community.fileMetadata.appData.content.members
        ).filter((recipient) => recipient !== identity),
        silent: false,
      },
    };

    uploadResult = await uploadFileOverPeer(
      dotYouClient,
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
        overwriteFileId: message.fileId,
      },
      systemFileType: message.fileSystemType,
      transitOptions: {
        useAppNotification: true,
        appNotificationOptions: {
          appId: COMMUNITY_APP_ID,
          tagId: message.fileMetadata.appData.uniqueId as string,
          typeId: communityId,
          peerSubscriptionId: communityId,
          recipients: (
            notificationRecipients || community.fileMetadata.appData.content.members
          ).filter((recipient) => recipient !== identity),
          silent: false,
        },
      },
    };

    uploadResult = await uploadFile(
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
      dotYouClient,
      community,
      message,
      'keyHeader' in uploadResult ? uploadResult.keyHeader : undefined
    );
  }

  return {
    ...uploadResult,
    previewThumbnail: uploadMetadata.appData.previewThumbnail,
  };
};

export const updateCommunityMessage = async (
  dotYouClient: DotYouClient,
  community: HomebaseFile<CommunityDefinition>,
  message: HomebaseFile<CommunityMessage> | NewHomebaseFile<CommunityMessage>,
  keyHeader?: KeyHeader
): Promise<UploadResult | void> => {
  const communityId = community.fileMetadata.appData.uniqueId as string;
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  const messageContent = message.fileMetadata.appData.content;

  const uploadInstructions: UpdateHeaderInstructionSet = {
    storageOptions: {
      drive: targetDrive,
      overwriteFileId: message.fileId,
    },
    systemFileType: message.fileSystemType,
    storageIntent: 'header',
  };

  const payloadJson: string = jsonStringify64({ ...messageContent });
  const uploadMetadata: UploadFileMetadata = {
    versionTag: message?.fileMetadata.versionTag,
    allowDistribution: false,
    appData: {
      uniqueId: message.fileMetadata.appData.uniqueId,
      groupId: message.fileMetadata.appData.groupId,
      archivalStatus: (message.fileMetadata.appData as AppFileMetaData<CommunityMessage>)
        .archivalStatus,
      previewThumbnail: message.fileMetadata.appData.previewThumbnail,
      fileType: COMMUNITY_MESSAGE_FILE_TYPE,
      content: payloadJson,
    },
    isEncrypted: true,
    accessControlList: message.serverMetadata?.accessControlList ||
      community.fileMetadata.appData.content.acl || {
        requiredSecurityGroup: SecurityGroupType.AutoConnected,
      },
  };

  if (community.fileMetadata.senderOdinId !== dotYouClient.getIdentity()) {
    throw new Error('Not implemented exception');
  }

  return await uploadHeader(
    dotYouClient,
    keyHeader || (message as HomebaseFile<CommunityMessage>).sharedSecretEncryptedKeyHeader,
    uploadInstructions,
    uploadMetadata,
    async () => {
      const existingChatMessage = await getCommunityMessage(
        dotYouClient,
        community.fileMetadata.senderOdinId,
        communityId,
        message.fileMetadata.appData.uniqueId as string
      );
      if (!existingChatMessage) return;
      message.fileMetadata.versionTag = existingChatMessage.fileMetadata.versionTag;
      return await updateCommunityMessage(dotYouClient, community, message, keyHeader);
    }
  );
};

export const hardDeleteCommunityMessage = async (
  dotYouClient: DotYouClient,
  odinId: string,
  communityId: string,
  message: HomebaseFile<CommunityMessage>
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);
  if (odinId !== dotYouClient.getIdentity()) {
    if (!message.fileMetadata.globalTransitId) {
      throw new Error('Global Transit Id is required for hard delete over peer');
    }
    return await deleteFileOverPeer(
      dotYouClient,
      targetDrive,
      message.fileMetadata.globalTransitId,
      [odinId],
      message.fileSystemType
    );
  }

  return await deleteFile(
    dotYouClient,
    targetDrive,
    message.fileId,
    undefined,
    message.fileSystemType
  );
};

export const getCommunityMessage = async (
  dotYouClient: DotYouClient,
  odinId: string,
  communityId: string,
  chatMessageId: string,
  systemFileType?: SystemFileType
) => {
  const targetDrive = getTargetDriveFromCommunityId(communityId);

  if (odinId !== dotYouClient.getIdentity()) {
    return await getFileHeaderOverPeerByUniqueId<CommunityMessage>(
      dotYouClient,
      odinId,
      targetDrive,
      chatMessageId,
      {
        decrypt: true,
        systemFileType,
      }
    );
  }
  return await getFileHeaderByUniqueId<CommunityMessage>(dotYouClient, targetDrive, chatMessageId, {
    decrypt: true,
    systemFileType,
  });
};

export const getCommunityMessages = async (
  dotYouClient: DotYouClient,
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
    includeTransferHistory: true,
  };

  const response =
    odinId && odinId !== dotYouClient.getIdentity()
      ? await queryBatchOverPeer(dotYouClient, odinId, params, ro)
      : await queryBatch(dotYouClient, params, ro);
  return {
    ...response,
    searchResults:
      ((await Promise.all(
        response.searchResults
          .map(
            async (result) => await dsrToMessage(dotYouClient, result, odinId, targetDrive, true)
          )
          .filter(Boolean)
      )) as HomebaseFile<CommunityMessage>[]) || [],
  };
};

export const dsrToMessage = async (
  dotYouClient: DotYouClient,
  dsr: HomebaseFile,
  odinId: string | undefined,
  targetDrive: TargetDrive,
  includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityMessage> | null> => {
  try {
    const msgContent =
      odinId && dotYouClient.getIdentity() !== odinId
        ? await getContentFromHeaderOrPayloadOverPeer<CommunityMessage>(
            dotYouClient,
            odinId,
            targetDrive,
            dsr,
            includeMetadataHeader
          )
        : await getContentFromHeaderOrPayload<CommunityMessage>(
            dotYouClient,
            targetDrive,
            dsr,
            includeMetadataHeader
          );
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
