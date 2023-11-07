import { DotYouClient } from '../../core/DotYouClient';
import { uploadFile, uploadHeader } from '../../core/DriveData/Upload/DriveFileUploadProvider';
import {
  AccessControlList,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/Upload/DriveUploadTypes';
import { DEFAULT_PAYLOAD_KEY } from '../../core/DriveData/Upload/UploadHelpers';
import { VideoContentType, uploadVideo } from '../../core/MediaData/VideoProvider';
import {
  EmbeddedThumb,
  PayloadFile,
  TargetDrive,
  ThumbnailFile,
  createThumbnails,
  deletePayload,
  getFileHeader,
} from '../../core/core';
import {
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringToUint8Array,
  toGuidId,
} from '../../helpers/DataUtil';
import { segmentVideoFile } from '../../helpers/VideoSegmenter';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { getPost, getPostBySlug } from './PostProvider';
import {
  PostContent,
  PostFile,
  NewMediaFile,
  MediaFile,
  BlogConfig,
  postTypeToDataType,
  Media,
} from './PostTypes';

const POST_MEDIA_PAYLOAD_KEY = 'pst_mdi';

export const savePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: PostFile<T>,
  channelId: string,
  newMediaFiles?: NewMediaFile[],
  onVersionConflict?: () => void,
  onUpdate?: (progress: number) => void
): Promise<UploadResult> => {
  if (!file.content.id) {
    file.content.id = file.content.slug ? toGuidId(file.content.slug) : getNewId();
  } else if (!file.fileId) {
    // Check if content.id exists and with which fileId
    file.fileId = (await getPost(dotYouClient, channelId, file.content.id))?.fileId ?? undefined;
  }

  if (!file.content.authorOdinId) file.content.authorOdinId = dotYouClient.getIdentity();
  if (!file.acl) throw 'ACL is required to save a post';

  // Delete embeddedPost of embeddedPost (we don't want to embed an embed)
  if (file.content.embeddedPost) {
    delete (file.content.embeddedPost as any)['embeddedPost'];
  }

  const targetDrive = GetTargetDriveFromChannelId(channelId);

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const mediaFiles: MediaFile[] = [];
  let previewThumbnail: EmbeddedThumb | undefined;

  // Handle image files:
  for (let i = 0; newMediaFiles && i < newMediaFiles?.length; i++) {
    const newMediaFile = newMediaFiles[i];
    if (newMediaFile.file.type.startsWith('video/')) {
      const mediaFile = await uploadVideoFile(dotYouClient, newMediaFile, targetDrive, file.acl);
      mediaFiles.push(mediaFile.mediaFile);
      if (!previewThumbnail) previewThumbnail = mediaFile.tinyThumb;
    } else {
      const payloadKey = `${POST_MEDIA_PAYLOAD_KEY}${i}`;
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.file,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
      });

      mediaFiles.push({
        fileId: undefined,
        fileKey: payloadKey,
        type: 'image',
      });
      if (!previewThumbnail) previewThumbnail = tinyThumb;
    }
    onUpdate?.((i + 1) / newMediaFiles.length);
  }

  if (mediaFiles?.length) {
    (file.content as Media).mediaFiles =
      mediaFiles && mediaFiles.length > 1 ? mediaFiles : undefined;
  }
  file.content.primaryMediaFile = mediaFiles[0];

  return await uploadPost(
    dotYouClient,
    file,
    payloads,
    thumbnails,
    previewThumbnail,
    channelId,
    targetDrive,
    onVersionConflict
  );
};

const uploadVideoFile = async (
  dotYouClient: DotYouClient,
  videoFile: NewMediaFile,
  targetDrive: TargetDrive,
  acl: AccessControlList
): Promise<{ mediaFile: MediaFile; tinyThumb: EmbeddedThumb | undefined }> => {
  const uploadResult = await (async () => {
    // if (file.file.type === 'video/mp4') {
    // if video is tiny enough (less than 10MB), don't segment just upload
    if (videoFile.file.size < 10000000 || 'bytes' in videoFile.file)
      return await uploadVideo(
        dotYouClient,
        targetDrive,
        acl,
        videoFile.file,
        { isSegmented: false, mimeType: videoFile.file.type, fileSize: videoFile.file.size },
        {
          type: videoFile.file.type as VideoContentType,
          thumb: 'thumbnail' in videoFile ? videoFile.thumbnail : undefined,
        }
      );

    const { data: segmentedVideoData, metadata } = await segmentVideoFile(videoFile.file);

    return await uploadVideo(dotYouClient, targetDrive, acl, segmentedVideoData, metadata, {
      type: videoFile.file.type as VideoContentType,
      thumb: 'thumbnail' in videoFile ? videoFile.thumbnail : undefined,
    });
  })();

  if (!uploadResult) throw new Error(`[DotYouCore-js] PostProvider: Video Upload failed`);

  return {
    mediaFile: {
      fileId: uploadResult.fileId,
      fileKey: uploadResult.fileKey,
      type: uploadResult.type,
    },
    tinyThumb: uploadResult.previewThumbnail,
  };
};

const uploadPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: PostFile<T>,
  payloads: PayloadFile[],
  thumbnails: ThumbnailFile[],
  previewThumbnail: EmbeddedThumb | undefined,
  channelId: string,
  targetDrive: TargetDrive,
  onVersionConflict?: () => void
) => {
  const encrypt = !(
    file.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: file?.fileId ?? '',
      drive: targetDrive,
    },
    transitOptions: {
      useGlobalTransitId: true,
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      sendContents: SendContents.All, // TODO: Should this be header only?
    },
  };

  const existingPostWithThisSlug = await getPostBySlug(
    dotYouClient,
    channelId,
    file.content.slug ?? file.content.id
  );

  if (existingPostWithThisSlug && existingPostWithThisSlug?.content.id !== file.content.id) {
    // There is clash with an existing slug
    file.content.slug = `${file.content.slug}-${new Date().getTime()}`;
  }
  const uniqueId = file.content.slug ? toGuidId(file.content.slug) : file.content.id;

  const payloadJson: string = jsonStringify64({ ...file.content, fileId: undefined });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const content = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.content.channelId }); // If the full payload can't be embedded into the header file, at least pass the channelId so when getting, the location is known

  if (!shouldEmbedContent) {
    payloads.push({
      key: DEFAULT_PAYLOAD_KEY,
      payload: new Blob([payloadBytes], { type: 'application/json' }),
    });
  }

  const isDraft = file.isDraft ?? false;

  const metadata: UploadFileMetadata = {
    versionTag: file?.versionTag,
    allowDistribution: !isDraft,
    appData: {
      tags: [file.content.id],
      uniqueId: uniqueId,
      fileType: isDraft ? BlogConfig.DraftPostFileType : BlogConfig.PostFileType,
      content: content,
      previewThumbnail: previewThumbnail,
      userDate: file.userDate,
      dataType: postTypeToDataType(file.content.type),
    },
    senderOdinId: file.content.authorOdinId,
    isEncrypted: encrypt,
    accessControlList: file.acl,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    encrypt,
    onVersionConflict
  );
  if (!result) throw new Error(`Upload failed`);

  return result;
};

const uploadPostHeader = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: PostFile<T>,
  targetDrive: TargetDrive
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, file.fileId as string);

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: file?.fileId ?? '',
      drive: targetDrive,
    },
    transitOptions: {
      useGlobalTransitId: true,
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      sendContents: SendContents.All, // TODO: Should this be header only?
    },
  };

  const payloadJson: string = jsonStringify64({ ...file.content, fileId: undefined });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;
  const content = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.content.channelId });

  const isDraft = file.isDraft ?? false;

  const metadata: UploadFileMetadata = {
    versionTag: header?.fileMetadata?.versionTag,
    allowDistribution: !isDraft,
    appData: {
      tags: [file.content.id],
      uniqueId: file.content.id,
      fileType: isDraft ? BlogConfig.DraftPostFileType : BlogConfig.PostFileType,
      content: content,
      previewThumbnail: file.previewThumbnail,
      userDate: file.userDate,
      dataType: postTypeToDataType(file.content.type),
    },
    senderOdinId: file.content.authorOdinId,
    isEncrypted: file.isEncrypted ?? false,
    accessControlList: file.acl,
  };

  if (!shouldEmbedContent) {
    throw new Error(
      `[DotYouCore-js] PostProvider: Payloads are not supported for post updates ATM`
    );
    // Append/update payload
  }

  console.log(
    'uploadHeader',
    dotYouClient,
    header?.sharedSecretEncryptedKeyHeader,
    instructionSet,
    metadata
  );
  return await uploadHeader(
    dotYouClient,
    file.isEncrypted ? header?.sharedSecretEncryptedKeyHeader : undefined,
    instructionSet,
    metadata
  );
};

export const updatePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: PostFile<T>,
  channelId: string,
  mediaFiles: MediaFile[]
): Promise<UploadResult> => {
  const newMediaFiles = mediaFiles || (file.content as Media).mediaFiles;

  if (!file.fileId || !file.acl || !file.content.id)
    throw new Error(`[DotYouCore-js] PostProvider: fileId is required to update a post`);

  if (!file.content.authorOdinId) file.content.authorOdinId = dotYouClient.getIdentity();

  const targetDrive = GetTargetDriveFromChannelId(channelId);

  // MediaFiles is only defined if it is updated
  if (mediaFiles) {
    // Discover deleted files:
    const mediaFiles =
      (file.content as Media).mediaFiles ||
      (file.content.primaryMediaFile ? [file.content.primaryMediaFile] : []);
    const deletedMediaFiles: MediaFile[] = [];
    for (let i = 0; mediaFiles && i < mediaFiles?.length; i++) {
      const mediaFile = mediaFiles[i];
      if (!newMediaFiles?.find((f) => f.fileId === mediaFile.fileId)) {
        deletedMediaFiles.push(mediaFile);
      }
    }

    // Remove the payloads that are removed from the post
    if (deletedMediaFiles.length) {
      deletedMediaFiles.forEach(async (mediaFile) => {
        await deletePayload(dotYouClient, targetDrive, file.fileId as string, mediaFile.fileKey);
      });
    }
  }

  if (newMediaFiles?.length) {
    (file.content as Media).mediaFiles =
      newMediaFiles && newMediaFiles.length > 1 ? newMediaFiles : undefined;
  }
  file.content.primaryMediaFile = newMediaFiles?.[0];

  const result = await uploadPostHeader(dotYouClient, file, targetDrive);
  if (!result) throw new Error(`[DotYouCore-js] PostProvider: Post update failed`);

  return result;
};
