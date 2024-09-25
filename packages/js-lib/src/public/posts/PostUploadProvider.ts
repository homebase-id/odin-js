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
  UpdateInstructionSet,
  UpdateResult,
  UploadFileMetadata,
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
} from '../../core/core';
import {
  base64ToUint8Array,
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
  toGuidId,
} from '../../helpers/DataUtil';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { getPost, getPostBySlug } from './PostProvider';
import { PostContent, BlogConfig, postTypeToDataType } from './PostTypes';
import { makeGrid } from '../../helpers/ImageMerger';
import { processVideoFile } from '../../media/Video/VideoProcessor';
import { createThumbnails, LinkPreview, LinkPreviewDescriptor } from '../../media/media';
import {
  appendDataToFileOverPeer,
  deletePayloadOverPeer,
  getFileHeaderBytesOverPeerByGlobalTransitId,
  getPostBySlugOverPeer,
  PeerAppendInstructionSet,
  uploadFileOverPeer,
  uploadHeaderOverPeer,
} from '../../peer/peer';
import { TransitInstructionSet, TransitUploadResult } from '../../peer/peerData/PeerTypes';
import { AxiosRequestConfig } from 'axios';
const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

const POST_MEDIA_PAYLOAD_KEY = 'pst_mdi';
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
    throw new Error('[PostUploadProvider] ACL is required to save a post');

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

  // Set authorOdinId if not set
  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getIdentity();

  // Delete embeddedPost of embeddedPost (we don't want to embed an embed)
  if (file.fileMetadata.appData.content.embeddedPost) {
    delete (file.fileMetadata.appData.content.embeddedPost as PostContent)['embeddedPost'];
  }

  if (file.fileId) {
    if (linkPreviews?.length) {
      throw new Error(
        '[PostUploadProvider] Changing Link previews are not supported for post updates'
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
        '[PostUploadProvider] Cannot upload a new post with an existing media file. Use updatePost instead'
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

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];
  const aesKey = getRandom16ByteArray();

  if (!newMediaFiles?.length && linkPreviews?.length) {
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
      key: POST_LINKS_PAYLOAD_KEY,
      payload: new Blob([stringToUint8Array(JSON.stringify(linkPreviews))], {
        type: 'application/json',
      }),
      descriptorContent,
      previewThumbnail: tinyThumb,
    });
  }

  // Handle image files:
  for (let i = 0; newMediaFiles && i < newMediaFiles?.length; i++) {
    const newMediaFile = newMediaFiles[i];
    const payloadKey = newMediaFile.key || `${POST_MEDIA_PAYLOAD_KEY}${i}`;
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
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
    } else {
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
        descriptorContent: (newMediaFile.file as File).name || newMediaFile.file.type,
      });
    }
    onUpdate?.((i + 1) / newMediaFiles.length);
  }

  // Don't force the primaryMediaFile on articles
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

  const encrypt = !(
    file.serverMetadata?.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

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

  const existingPostWithThisSlug = odinId
    ? await getPostBySlugOverPeer(
        dotYouClient,
        odinId,
        channelId,
        file.fileMetadata.appData.content.slug ?? file.fileMetadata.appData.content.id
      )
    : await getPostBySlug(
        dotYouClient,
        channelId,
        file.fileMetadata.appData.content.slug ?? file.fileMetadata.appData.content.id
      );

  if (
    existingPostWithThisSlug &&
    !stringGuidsEqual(existingPostWithThisSlug?.fileId, file.fileId)
  ) {
    // There is clash with an existing slug
    file.fileMetadata.appData.content.slug = `${
      file.fileMetadata.appData.content.slug
    }-${new Date().getTime()}`;
  }

  const uniqueId = file.fileMetadata.appData.content.slug
    ? toGuidId(file.fileMetadata.appData.content.slug)
    : file.fileMetadata.appData.content.id;

  const payloadJson: string = jsonStringify64({ ...file.fileMetadata.appData.content });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const content = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.fileMetadata.appData.content.channelId }); // If the full payload can't be embedded into the header file, at least pass the channelId so when getting, the location is known

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
    });
  }

  const isDraft = file.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType;
  const metadata: UploadFileMetadata = {
    versionTag: file?.fileMetadata.versionTag ?? undefined,
    allowDistribution: !!odinId || !isDraft,
    appData: {
      tags: [file.fileMetadata.appData.content.id],
      uniqueId: uniqueId,
      fileType: isDraft ? BlogConfig.DraftPostFileType : BlogConfig.PostFileType,
      content: content,
      previewThumbnail: previewThumbnail,
      userDate: file.fileMetadata.appData.userDate,
      dataType: postTypeToDataType(file.fileMetadata.appData.content.type),
    },
    senderOdinId: file.fileMetadata.appData.content.authorOdinId,
    isEncrypted: encrypt,
    accessControlList: file.serverMetadata?.accessControlList,
  };

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

    if (!result) throw new Error(`[PostUploadProvider] Upload failed`);
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

    if (!result) throw new Error(`[PostUploadProvider] Upload over peer failed`);
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

  if (!header) throw new Error('[PostUploadProvider] Cannot update a post that does not exist');
  if (header?.fileMetadata.versionTag !== file.fileMetadata.versionTag) {
    if (odinId) {
      // There's a conflict, but we will just force ahead
      file.fileMetadata.versionTag = header.fileMetadata.versionTag;
    } else {
      throw new Error('[PostUploadProvider] Version conflict');
    }
  }
  if (
    !file.fileId ||
    !file.serverMetadata?.accessControlList ||
    !file.fileMetadata.appData.content.id
  )
    throw new Error(`[odin-js] PostProvider: fileId is required to update a post`);

  if (odinId && !file.fileMetadata.globalTransitId) {
    throw new Error(`[odin-js]: globalTransitId is required to update a post over peer`);
  }

  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getIdentity();

  const encrypt = !(
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );
  const keyHeader = encrypt
    ? header.sharedSecretEncryptedKeyHeader || GenerateKeyHeader()
    : undefined;
  if (keyHeader) file.sharedSecretEncryptedKeyHeader = keyHeader;

  let runningVersionTag: string = file.fileMetadata.versionTag;
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
  }

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

  // When all media is removed from the post, remove the preview thumbnail
  if (existingMediaFiles.length === deletedMediaFiles.length)
    file.fileMetadata.appData.previewThumbnail = undefined;

  // Process new files:
  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumbnail: EmbeddedThumb | undefined;
  for (let i = 0; newMediaFiles && i < newMediaFiles.length; i++) {
    const newMediaFile = newMediaFiles[i];
    // We ignore existing files as they are just kept
    if (!('file' in newMediaFile)) {
      continue;
    }

    const payloadKey =
      newMediaFile.key ||
      `${POST_MEDIA_PAYLOAD_KEY}${(existingAndNewMediaFiles || newMediaFiles).length + i}`;

    const { additionalThumbnails, tinyThumb } = await createThumbnails(
      newMediaFile.file,
      payloadKey
    );

    payloads.push({
      payload: newMediaFile.file,
      key: payloadKey,
      previewThumbnail: tinyThumb,
    });
    thumbnails.push(...additionalThumbnails);
    previewThumbnail = previewThumbnail || tinyThumb;

    onUpdate?.((i + 1) / newMediaFiles.length);
  }

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

  if (file.fileMetadata.appData.content.type !== 'Article') {
    if (existingMediaFiles?.length)
      file.fileMetadata.appData.content.primaryMediaFile = {
        fileId: file.fileId,
        fileKey: existingMediaFiles[0].key,
        type: existingMediaFiles[0].contentType,
      };
  }

  file.fileMetadata.appData.previewThumbnail =
    deletedMediaFiles.length && existingMediaFiles.length === 1
      ? previewThumbnail
      : file.fileMetadata.appData.previewThumbnail || previewThumbnail;

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
  const existingPostWithThisSlug = await getPostBySlug(
    dotYouClient,
    channelId,
    file.fileMetadata.appData.content.slug ?? file.fileMetadata.appData.content.id
  );

  if (
    existingPostWithThisSlug &&
    existingPostWithThisSlug?.fileMetadata.appData.content.id !==
      file.fileMetadata.appData.content.id
  ) {
    // There is clash with an existing slug
    file.fileMetadata.appData.content.slug = `${
      file.fileMetadata.appData.content.slug
    }-${new Date().getTime()}`;
  }

  const uniqueId = file.fileMetadata.appData.content.slug
    ? toGuidId(file.fileMetadata.appData.content.slug)
    : file.fileMetadata.appData.content.id;

  const payloadJson: string = jsonStringify64({
    ...file.fileMetadata.appData.content,
    fileId: undefined,
  });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const content = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.fileMetadata.appData.content.channelId });

  const isDraft = file.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType;
  const metadata: UploadFileMetadata = {
    versionTag: file.fileMetadata.versionTag ?? undefined,
    allowDistribution: !isDraft,
    appData: {
      tags: [file.fileMetadata.appData.content.id],
      uniqueId: uniqueId,
      fileType: isDraft ? BlogConfig.DraftPostFileType : BlogConfig.PostFileType,
      content: content,
      previewThumbnail: file.fileMetadata.appData.previewThumbnail,
      userDate: file.fileMetadata.appData.userDate,
      dataType: postTypeToDataType(file.fileMetadata.appData.content.type),
    },
    senderOdinId: file.fileMetadata.appData.content.authorOdinId,
    isEncrypted: file.fileMetadata.isEncrypted ?? false,
    accessControlList: file.serverMetadata?.accessControlList,
  };

  let runningVersionTag = file.fileMetadata.versionTag;
  if (!shouldEmbedContent) {
    const payloads = [
      {
        key: DEFAULT_PAYLOAD_KEY,
        payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
      },
    ];

    const appendInstructionSet: AppendInstructionSet = {
      targetFile: {
        fileId: file.fileId as string,
        targetDrive: targetDrive,
      },
      versionTag: runningVersionTag,
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
      sendContents: SendContents.All, // TODO: Should this be header only?
    },
  };
  return await uploadHeader(
    dotYouClient,
    file.fileMetadata.isEncrypted ? file.sharedSecretEncryptedKeyHeader : undefined,
    instructionSet,
    metadata,
    onVersionConflict
  );
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

  const existingPostWithThisSlug = await getPostBySlugOverPeer(
    dotYouClient,
    odinId,
    channelId,
    file.fileMetadata.appData.content.slug ?? file.fileMetadata.appData.content.id
  );

  if (
    existingPostWithThisSlug &&
    existingPostWithThisSlug?.fileMetadata.appData.content.id !==
      file.fileMetadata.appData.content.id
  ) {
    // There is clash with an existing slug
    file.fileMetadata.appData.content.slug = `${
      file.fileMetadata.appData.content.slug
    }-${new Date().getTime()}`;
  }

  const uniqueId = file.fileMetadata.appData.content.slug
    ? toGuidId(file.fileMetadata.appData.content.slug)
    : file.fileMetadata.appData.content.id;

  const payloadJson: string = jsonStringify64({
    ...file.fileMetadata.appData.content,
    fileId: undefined,
  });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const content = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.fileMetadata.appData.content.channelId });

  const isDraft = file.fileMetadata.appData.fileType === BlogConfig.DraftPostFileType;
  const metadata: UploadFileMetadata = {
    versionTag: file.fileMetadata.versionTag ?? undefined,
    allowDistribution: !isDraft,
    appData: {
      tags: [file.fileMetadata.appData.content.id],
      uniqueId: uniqueId,
      fileType: isDraft ? BlogConfig.DraftPostFileType : BlogConfig.PostFileType,
      content: content,
      previewThumbnail: file.fileMetadata.appData.previewThumbnail,
      userDate: file.fileMetadata.appData.userDate,
      dataType: postTypeToDataType(file.fileMetadata.appData.content.type),
    },
    senderOdinId: file.fileMetadata.appData.content.authorOdinId,
    isEncrypted: file.fileMetadata.isEncrypted ?? false,
    accessControlList: file.serverMetadata?.accessControlList,
  };

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
    });
  }

  const instructionSet: UpdateInstructionSet = {
    transferIv: getRandom16ByteArray(),
    locale: 'peer',
    targetFile: {
      globalTransitId: file.fileMetadata.globalTransitId as string,
      targetDrive,
    },
    versionTag: file.fileMetadata.versionTag,
    recipients: [odinId],
  };

  for (let i = 0; newMediaFiles && i < newMediaFiles?.length; i++) {
    const newMediaFile = newMediaFiles[i];
    const payloadKey = newMediaFile.key || `${POST_MEDIA_PAYLOAD_KEY}${i}`;
    if (newMediaFile.file.type.startsWith('video/')) {
      // TODO: figure out AESKEY
      // const {
      //   tinyThumb,
      //   thumbnails: thumbnailsFromVideo,
      //   payloads: payloadsFromVideo,
      // } = await processVideoFile(newMediaFile, payloadKey, aesKey);
      // thumbnails.push(...thumbnailsFromVideo);
      // payloads.push(...payloadsFromVideo);
      // if (tinyThumb) previewThumbnails.push(tinyThumb);
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
        descriptorContent: (newMediaFile.file as File).name || newMediaFile.file.type,
      });
    }
    onUpdate?.((i + 1) / newMediaFiles.length);
  }

  const deletedPayloads = deletedMediaFiles?.map((payload) => {
    return { key: payload.key };
  });

  const updateResult = await patchFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    deletedPayloads,
    encrypt,
    undefined
  );

  if (!updateResult) throw new Error(`[PostUploadProvider]: Post update failed`);
  return updateResult;
};
