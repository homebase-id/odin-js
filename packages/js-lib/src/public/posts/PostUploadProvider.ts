import { DotYouClient } from '../../core/DotYouClient';
import {
  appendDataToFile,
  patchFile,
  uploadFile,
  uploadHeader,
} from '../../core/DriveData/Upload/DriveFileUploadProvider';
import {
  AppendInstructionSet,
  PriorityOptions,
  ScheduleOptions,
  SendContents,
  UpdateHeaderInstructionSet,
  UpdateInstructionSet,
  UpdateResult,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/Upload/DriveUploadTypes';
import { SecurityGroupType } from '../../core/DriveData/File/DriveFileTypes';
import { DEFAULT_PAYLOAD_KEY, GenerateKeyHeader } from '../../core/DriveData/Upload/UploadHelpers';
import {
  HomebaseFile,
  NewHomebaseFile,
  EmbeddedThumb,
  PayloadFile,
  TargetDrive,
  ThumbnailFile,
  deletePayload,
  getFileHeader,
  NewMediaFile,
  MediaFile,
  decryptKeyHeader,
} from '../../core/core';
import { getNewId, getRandom16ByteArray, toGuidId } from '../../helpers/DataUtil';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { getPost } from './PostProvider';
import { PostContent } from './PostTypes';
import { makeGrid } from '../../helpers/ImageMerger';
import { LinkPreview } from '../../media/media';
import {
  appendDataToFileOverPeer,
  deletePayloadOverPeer,
  getFileHeaderBytesOverPeerByGlobalTransitId,
  PeerAppendInstructionSet,
  uploadFileOverPeer,
} from '../../peer/peer';
import { TransitInstructionSet, TransitUploadResult } from '../../peer/peerData/PeerTypes';

import {
  getPayloadForLinkPreview,
  getPayloadsAndThumbnailsForNewMedia,
  getUploadFileMetadata,
  hasConflictingSlug,
} from './PostUploadHelpers';

export const POST_LINKS_PAYLOAD_KEY = 'pst_links';

export const savePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: HomebaseFile<T> | NewHomebaseFile<T>,
  odinId: string | undefined,
  channelId: string,
  toSaveFiles?: (NewMediaFile | MediaFile)[] | NewMediaFile[],
  linkPreviews?: LinkPreview[],
  onVersionConflict?: () => void,
  onUpdate?: (progress: number) => void
): Promise<UploadResult | TransitUploadResult | UpdateResult> => {
  // Enforce an ACL
  if (!file.serverMetadata?.accessControlList)
    throw new Error('[odin-js] PostUploadProvider: ACL is required to save a post');

  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getIdentity();

  if (!file.fileMetadata.appData.content.id) {
    // The content id is set once, and then never updated to keep the permalinks correct at all times; Even when the slug changes
    file.fileMetadata.appData.content.id = file.fileMetadata.appData.content.slug
      ? toGuidId(file.fileMetadata.appData.content.slug)
      : getNewId();
  } else if (!file.fileId && !odinId) {
    // Check if fileMetadata.appData.content.id already exists and with which fileId if it does
    file.fileId =
      (await getPost(dotYouClient, channelId, file.fileMetadata.appData.content.id))?.fileId ??
      undefined;
  }

  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getIdentity();

  if (file.fileId) {
    return await updatePost(dotYouClient, odinId, file as HomebaseFile<T>, channelId, toSaveFiles);
  } else {
    if (toSaveFiles?.some((file) => 'fileKey' in file)) {
      throw new Error(
        'Cannot upload a new post with an existing media file. Use updatePost instead'
      );
    }
  }

  if (!file.serverMetadata?.accessControlList) throw 'ACL is required to save a post';

  // Delete embeddedPost of embeddedPost (we don't want to embed an embed)
  if (file.fileMetadata.appData.content.embeddedPost) {
    delete (file.fileMetadata.appData.content.embeddedPost as PostContent)['embeddedPost'];
  }

  if (file.fileId) {
    if (linkPreviews?.length) {
      throw new Error(
        '[odin-js] PostUploadProvider: Changing Link previews are not supported for post updates'
      );
    }
    return await updatePost(
      dotYouClient,
      odinId,
      file as HomebaseFile<T>,
      channelId,
      toSaveFiles,
      onVersionConflict,
      onUpdate
    );
  } else {
    if (toSaveFiles?.some((file) => 'fileKey' in file)) {
      throw new Error(
        '[odin-js] PostUploadProvider: Cannot upload a new post with an existing media file. Use updatePost instead'
      );
    }

    return await uploadPost(
      dotYouClient,
      odinId,
      file as NewHomebaseFile<T>,
      channelId,
      toSaveFiles as NewMediaFile[] | undefined,
      linkPreviews,
      onUpdate
    );
  }
};

const uploadPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: NewHomebaseFile<T>,
  channelId: string,
  toSaveFiles?: NewMediaFile[],
  linkPreviews?: LinkPreview[],
  onUpdate?: (progress: number) => void
) => {
  const newMediaFiles = toSaveFiles as NewMediaFile[];
  const targetDrive = GetTargetDriveFromChannelId(channelId);

  const encrypt = !(
    file.serverMetadata?.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const aesKey = encrypt ? getRandom16ByteArray() : undefined;

  if (!newMediaFiles?.length && linkPreviews?.length) {
    const linkPayload = await getPayloadForLinkPreview(linkPreviews);
    if (linkPayload) payloads.push(linkPayload);
  }

  const {
    payloads: newMediaPayloads,
    thumbnails: newMediaThumbnails,
    previewThumbnails,
  } = await getPayloadsAndThumbnailsForNewMedia(newMediaFiles, aesKey, onUpdate);

  payloads.push(...newMediaPayloads);
  thumbnails.push(...newMediaThumbnails);

  if (file.fileMetadata.appData.content.type !== 'Article') {
    file.fileMetadata.appData.content.primaryMediaFile = payloads[0]
      ? {
          fileId: undefined,
          fileKey: payloads[0].key,
          type: payloads[0].payload.type,
        }
      : undefined;
  }

  const previewThumbnail: EmbeddedThumb | undefined =
    previewThumbnails?.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: file?.fileId ?? '',
      drive: targetDrive,
    },
    transitOptions: {
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      priority: PriorityOptions.Medium,
      sendContents: SendContents.All,
    },
  };

  if (await hasConflictingSlug(dotYouClient, odinId, file, channelId)) {
    // There is clash with an existing slug
    file.fileMetadata.appData.content.slug = `${
      file.fileMetadata.appData.content.slug
    }-${new Date().getTime()}`;
  }

  const { metadata, defaultPayload } = await getUploadFileMetadata(odinId, file, previewThumbnail);
  if (defaultPayload) payloads.push(defaultPayload);

  if (!odinId) {
    const result = await uploadFile(
      dotYouClient,
      instructionSet,
      metadata,
      payloads,
      thumbnails,
      encrypt,
      undefined,
      { aesKey }
    );

    if (!result) throw new Error(`[odin-js] PostUploadProvider: Upload failed`);
    return result;
  } else {
    const transitInstructionSet: TransitInstructionSet = {
      transferIv: getRandom16ByteArray(),
      remoteTargetDrive: targetDrive,
      schedule: ScheduleOptions.SendLater,
      priority: PriorityOptions.Medium,
      recipients: [odinId],
    };

    const result: TransitUploadResult = await uploadFileOverPeer(
      dotYouClient,
      transitInstructionSet,
      metadata,
      payloads,
      thumbnails,
      encrypt,
      { aesKey }
    );

    if (!result) throw new Error(`[odin-js] PostUploadProvider: Upload over peer failed`);
    return result;
  }
};

const updatePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: HomebaseFile<T>,
  channelId: string,
  existingAndNewMediaFiles?: (NewMediaFile | MediaFile)[],
  onVersionConflict?: () => void,
  onUpdate?: (progress: number) => void
): Promise<UploadResult | UpdateResult> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = odinId
    ? await getFileHeaderBytesOverPeerByGlobalTransitId(
        dotYouClient,
        odinId,
        targetDrive,
        file.fileMetadata.globalTransitId as string
      )
    : await getFileHeader(dotYouClient, targetDrive, file.fileId as string);

  if (!header)
    throw new Error('[odin-js] PostUploadProvider: Cannot update a post that does not exist');

  if (header?.fileMetadata.versionTag !== file.fileMetadata.versionTag) {
    if (odinId) {
      // There's a conflict, but we will just force ahead
      file.fileMetadata.versionTag = header.fileMetadata.versionTag;
    } else {
      throw new Error('[odin-js] PostUploadProvider: Version conflict');
    }
  }
  if (
    !file.fileId ||
    !file.serverMetadata?.accessControlList ||
    !file.fileMetadata.appData.content.id
  ) {
    throw new Error(`[odin-js] PostUploadProvider: fileId is required to update a post`);
  }

  if (odinId && !file.fileMetadata.globalTransitId) {
    throw new Error(
      `[odin-js] PostUploadProvider: globalTransitId is required to update a post over peer`
    );
  }

  const encrypt = !(
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );
  const keyHeader = encrypt
    ? header.sharedSecretEncryptedKeyHeader || GenerateKeyHeader()
    : undefined;
  if (keyHeader) file.sharedSecretEncryptedKeyHeader = keyHeader;

  const existingMediaFiles =
    file.fileMetadata.payloads?.filter(
      (p) => p.key !== DEFAULT_PAYLOAD_KEY && p.key !== POST_LINKS_PAYLOAD_KEY
    ) || [];

  const newMediaFiles: NewMediaFile[] =
    (existingAndNewMediaFiles?.filter(
      (f) => 'file' in f && f.file instanceof Blob
    ) as NewMediaFile[]) || [];

  // Discover deleted files:
  const deletedMediaFiles: MediaFile[] = [];
  for (let i = 0; existingMediaFiles && i < existingMediaFiles?.length; i++) {
    const existingMediaFile = existingMediaFiles[i];
    if (!existingAndNewMediaFiles?.find((f) => f.key === existingMediaFile.key)) {
      deletedMediaFiles.push(existingMediaFile);
    }
  }

  if (odinId) {
    return await patchPost(
      dotYouClient,
      odinId,
      file,
      channelId,
      newMediaFiles,
      deletedMediaFiles,
      onUpdate
    );
  } else {
    return await patchLocalPost(
      dotYouClient,
      odinId,
      file,
      channelId,
      newMediaFiles,
      deletedMediaFiles,
      onVersionConflict,
      onUpdate
    );
  }
};

const patchPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string,
  file: HomebaseFile<T>,
  channelId: string,
  newMediaFiles?: NewMediaFile[],
  deletedMediaFiles?: MediaFile[],
  onUpdate?: (progress: number) => void
): Promise<UpdateResult> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const encrypt = !(
    file.serverMetadata?.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

  if (await hasConflictingSlug(dotYouClient, odinId, file, channelId)) {
    // There is clash with an existing slug
    file.fileMetadata.appData.content.slug = `${
      file.fileMetadata.appData.content.slug
    }-${new Date().getTime()}`;
  }

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

  const instructionSet: UpdateInstructionSet = {
    transferIv: getRandom16ByteArray(),
    locale: 'peer',
    file: {
      globalTransitId: file.fileMetadata.globalTransitId as string,
      targetDrive,
    },
    versionTag: file.fileMetadata.versionTag,
    recipients: [odinId],
  };

  const encryptedKeyHeader = encrypt
    ? file.sharedSecretEncryptedKeyHeader || GenerateKeyHeader()
    : undefined;

  // decrypt keyheader;
  const decryptedKeyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : undefined;

  const {
    payloads: newMediaPayloads,
    thumbnails: newMediaThumbnails,
    previewThumbnails,
  } = await getPayloadsAndThumbnailsForNewMedia(
    newMediaFiles || [],
    decryptedKeyHeader?.aesKey,
    onUpdate
  );

  payloads.push(...newMediaPayloads);
  thumbnails.push(...newMediaThumbnails);

  const previewThumbnail: EmbeddedThumb | undefined =
    previewThumbnails?.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

  const { metadata, defaultPayload } = await getUploadFileMetadata(odinId, file, previewThumbnail);
  if (defaultPayload) payloads.push(defaultPayload);

  const deletedPayloads = deletedMediaFiles?.map((payload) => {
    return { key: payload.key };
  });

  const updateResult = await patchFile(
    dotYouClient,
    file.sharedSecretEncryptedKeyHeader,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    deletedPayloads,
    undefined
  );

  if (!updateResult) throw new Error(`[PostUploadProvider]: Post update failed`);
  return updateResult;
};

const patchLocalPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: HomebaseFile<T>,
  channelId: string,
  newMediaFiles: NewMediaFile[],
  deletedMediaFiles: MediaFile[],
  onVersionConflict?: () => void,
  onUpdate?: (progress: number) => void
) => {
  // Eventually the patch post api will be removed and the patch file api will be used
  if (
    !file.fileId ||
    !file.serverMetadata?.accessControlList ||
    !file.fileMetadata.appData.content.id
  )
    throw new Error(`[odin-js] PostUploadProvider: fileId is required to update a post`);

  const targetDrive = GetTargetDriveFromChannelId(channelId);
  let runningVersionTag: string = file.fileMetadata.versionTag;

  const encrypt = !(
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const keyHeader = encrypt
    ? file.sharedSecretEncryptedKeyHeader || GenerateKeyHeader()
    : undefined;
  if (keyHeader) file.sharedSecretEncryptedKeyHeader = keyHeader;

  // Remove the payloads that are removed from the post
  if (deletedMediaFiles.length) {
    for (let i = 0; i < deletedMediaFiles.length; i++) {
      const mediaFile = deletedMediaFiles[i];
      if (odinId) {
        runningVersionTag = (
          await deletePayloadOverPeer(
            dotYouClient,
            targetDrive,
            file.fileMetadata.globalTransitId as string,
            mediaFile.key,
            runningVersionTag,
            [odinId]
          )
        ).newVersionTag;
      } else {
        runningVersionTag = (
          await deletePayload(
            dotYouClient,
            targetDrive,
            file.fileId as string,
            mediaFile.key,
            runningVersionTag
          )
        ).newVersionTag;
      }
    }
  }

  // // When all media is removed from the post, remove the preview thumbnail
  // if (existingMediaFiles.length === deletedMediaFiles.length)
  //   file.fileMetadata.appData.previewThumbnail = undefined;

  // Process new files:
  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumbnail: EmbeddedThumb | undefined;

  // decrypt keyheader;
  const decryptedKeyHeader = keyHeader
    ? await decryptKeyHeader(dotYouClient, keyHeader)
    : undefined;

  const { payloads: newMediaPayloads, thumbnails: newMediaThumbnails } =
    await getPayloadsAndThumbnailsForNewMedia(newMediaFiles, decryptedKeyHeader?.aesKey, onUpdate);

  payloads.push(...newMediaPayloads);
  thumbnails.push(...newMediaThumbnails);

  // Append new files:
  if (payloads.length) {
    if (odinId) {
      const appendInstructionSet: PeerAppendInstructionSet = {
        targetFile: {
          globalTransitId: file.fileMetadata.globalTransitId as string,
          targetDrive: targetDrive,
        },
        versionTag: runningVersionTag,
        recipients: [odinId],
      };

      await appendDataToFileOverPeer(
        dotYouClient,
        keyHeader,
        appendInstructionSet,
        payloads,
        thumbnails,
        onVersionConflict
      );

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for the file to be available
      runningVersionTag =
        (
          await getFileHeaderBytesOverPeerByGlobalTransitId(
            dotYouClient,
            odinId,
            targetDrive,
            file.fileMetadata.globalTransitId as string
          )
        ).fileMetadata.versionTag || runningVersionTag;
    } else {
      const appendInstructionSet: AppendInstructionSet = {
        targetFile: {
          fileId: file.fileId as string,
          targetDrive: targetDrive,
        },
        versionTag: runningVersionTag,
        storageIntent: 'append',
      };

      runningVersionTag =
        (
          await appendDataToFile(
            dotYouClient,
            keyHeader,
            appendInstructionSet,
            payloads,
            thumbnails,
            onVersionConflict
          )
        )?.newVersionTag || runningVersionTag;
    }
  }

  file.fileMetadata.appData.previewThumbnail =
    file.fileMetadata.appData.previewThumbnail || previewThumbnail;

  file.fileMetadata.isEncrypted = encrypt;
  file.fileMetadata.versionTag = runningVersionTag;
  const result = await uploadPostHeader(
    dotYouClient,
    // odinId,
    file,
    channelId,
    targetDrive,
    onVersionConflict
  );
  if (!result) throw new Error(`[PostUploadProvider]: Post update failed`);

  return result;
};

const uploadPostHeader = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: HomebaseFile<T>,
  channelId: string,
  targetDrive: TargetDrive,
  onVersionConflict?: () => void
) => {
  if (await hasConflictingSlug(dotYouClient, undefined, file, channelId)) {
    // There is clash with an existing slug
    file.fileMetadata.appData.content.slug = `${
      file.fileMetadata.appData.content.slug
    }-${new Date().getTime()}`;
  }

  const { metadata, defaultPayload } = await getUploadFileMetadata(undefined, file);

  let runningVersionTag = file.fileMetadata.versionTag;
  if (defaultPayload) {
    const payloads = [defaultPayload];

    const appendInstructionSet: AppendInstructionSet = {
      targetFile: {
        fileId: file.fileId as string,
        targetDrive: targetDrive,
      },
      versionTag: runningVersionTag,
      storageIntent: 'append',
    };

    runningVersionTag =
      (
        await appendDataToFile(
          dotYouClient,
          file.fileMetadata.isEncrypted ? file.sharedSecretEncryptedKeyHeader : undefined,
          appendInstructionSet,
          payloads,
          undefined,
          onVersionConflict
        )
      )?.newVersionTag || runningVersionTag;
  } else if (file.fileMetadata.payloads?.some((p) => p.key === DEFAULT_PAYLOAD_KEY)) {
    // Remove default payload if it was there before
    runningVersionTag = (
      await deletePayload(
        dotYouClient,
        targetDrive,
        file.fileId as string,
        DEFAULT_PAYLOAD_KEY,
        file.fileMetadata.versionTag
      )
    ).newVersionTag;
  }

  if (runningVersionTag) metadata.versionTag = runningVersionTag;
  const instructionSet: UpdateHeaderInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: file?.fileId ?? '',
      drive: targetDrive,
    },
    transitOptions: {
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      priority: PriorityOptions.Medium,
      sendContents: SendContents.All, // TODO: Should this be header only?
    },
    storageIntent: 'header',
  };
  return await uploadHeader(
    dotYouClient,
    file.fileMetadata.isEncrypted ? file.sharedSecretEncryptedKeyHeader : undefined,
    instructionSet,
    metadata,
    onVersionConflict
  );
};
