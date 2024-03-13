import { DotYouClient } from '../../core/DotYouClient';
import {
  appendDataToFile,
  uploadFile,
  uploadHeader,
} from '../../core/DriveData/Upload/DriveFileUploadProvider';
import {
  AppendInstructionSet,
  ScheduleOptions,
  SendContents,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../../core/DriveData/Upload/DriveUploadTypes';
import { SecurityGroupType } from '../../core/DriveData/File/DriveFileTypes';
import { DEFAULT_PAYLOAD_KEY } from '../../core/DriveData/Upload/UploadHelpers';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  EmbeddedThumb,
  PayloadFile,
  TargetDrive,
  ThumbnailFile,
  deletePayload,
  getFileHeader,
} from '../../core/core';
import {
  getNewId,
  getRandom16ByteArray,
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
  toGuidId,
} from '../../helpers/DataUtil';
import { GetTargetDriveFromChannelId } from './PostDefinitionProvider';
import { getPost, getPostBySlug } from './PostProvider';
import { PostContent, NewMediaFile, MediaFile, BlogConfig, postTypeToDataType } from './PostTypes';
import { makeGrid } from '../../helpers/ImageMerger';
import { processVideoFile } from '../../media/Video/VideoProcessor';
import { createThumbnails } from '../../media/media';
const OdinBlob: typeof Blob =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;

const POST_MEDIA_PAYLOAD_KEY = 'pst_mdi';

export const savePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: DriveSearchResult<T> | NewDriveSearchResult<T>,
  channelId: string,
  toSaveFiles?: (NewMediaFile | MediaFile)[] | NewMediaFile[],
  onVersionConflict?: () => void,
  onUpdate?: (progress: number) => void
): Promise<UploadResult> => {
  if (!file.fileMetadata.appData.content.id) {
    // The content id is set once, and then never updated to keep the permalinks correct at all times; Even when the slug changes
    file.fileMetadata.appData.content.id = file.fileMetadata.appData.content.slug
      ? toGuidId(file.fileMetadata.appData.content.slug)
      : getNewId();
  } else if (!file.fileId) {
    // Check if fileMetadata.appData.content.id exists and with which fileId
    file.fileId =
      (await getPost(dotYouClient, channelId, file.fileMetadata.appData.content.id))?.fileId ??
      undefined;
  }

  if (file.fileId) {
    return await updatePost(dotYouClient, file as DriveSearchResult<T>, channelId, toSaveFiles);
  } else {
    if (toSaveFiles?.some((file) => 'fileKey' in file)) {
      throw new Error(
        'Cannot upload a new post with an existing media file. Use updatePost instead'
      );
    }
  }
  const newMediaFiles = toSaveFiles as NewMediaFile[];

  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getIdentity();
  if (!file.serverMetadata?.accessControlList) throw 'ACL is required to save a post';

  // Delete embeddedPost of embeddedPost (we don't want to embed an embed)
  if (file.fileMetadata.appData.content.embeddedPost) {
    delete (file.fileMetadata.appData.content.embeddedPost as PostContent)['embeddedPost'];
  }

  const targetDrive = GetTargetDriveFromChannelId(channelId);

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  const previewThumbnails: EmbeddedThumb[] = [];

  // Handle image files:
  for (let i = 0; newMediaFiles && i < newMediaFiles?.length; i++) {
    const payloadKey = `${POST_MEDIA_PAYLOAD_KEY}${i}`;
    const newMediaFile = newMediaFiles[i];
    if (newMediaFile.file.type.startsWith('video/')) {
      const { tinyThumb, additionalThumbnails, payload } = await processVideoFile(
        newMediaFile,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push(payload);

      if (tinyThumb) previewThumbnails.push(tinyThumb);

      onUpdate?.((i + 1) / newMediaFiles.length);
    } else {
      const { additionalThumbnails, tinyThumb } = await createThumbnails(
        newMediaFile.file,
        payloadKey
      );

      thumbnails.push(...additionalThumbnails);
      payloads.push({
        key: payloadKey,
        payload: newMediaFile.file,
      });

      if (tinyThumb) previewThumbnails.push(tinyThumb);
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

const uploadPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: DriveSearchResult<T> | NewDriveSearchResult<T>,
  payloads: PayloadFile[],
  thumbnails: ThumbnailFile[],
  previewThumbnail: EmbeddedThumb | undefined,
  channelId: string,
  targetDrive: TargetDrive,
  onVersionConflict?: () => void
) => {
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
      useGlobalTransitId: true,
      recipients: [],
      schedule: ScheduleOptions.SendLater,
      sendContents: SendContents.All, // TODO: Should this be header only?
    },
  };

  const existingPostWithThisSlug = await getPostBySlug(
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
    allowDistribution: !isDraft,
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
  file: DriveSearchResult<T>,
  channelId: string,
  targetDrive: TargetDrive
) => {
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

  let runningVersionTag;
  if (!shouldEmbedContent) {
    // Append/update payload
    runningVersionTag = (
      await appendDataToFile(
        dotYouClient,
        file.fileMetadata.isEncrypted ? file.sharedSecretEncryptedKeyHeader : undefined,
        {
          targetFile: {
            fileId: file.fileId as string,
            targetDrive: targetDrive,
          },
          versionTag: file.fileMetadata.versionTag,
        },
        [
          {
            key: DEFAULT_PAYLOAD_KEY,
            payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
          },
        ],
        undefined
      )
    ).newVersionTag;
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
  return await uploadHeader(
    dotYouClient,
    file.fileMetadata.isEncrypted ? file.sharedSecretEncryptedKeyHeader : undefined,
    instructionSet,
    metadata
  );
};

const updatePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  file: DriveSearchResult<T>,
  channelId: string,
  existingAndNewMediaFiles?: (NewMediaFile | MediaFile)[]
): Promise<UploadResult> => {
  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = await getFileHeader(dotYouClient, targetDrive, file.fileId as string);

  if (!header) throw new Error('Cannot update a post that does not exist');
  if (header?.fileMetadata.versionTag !== file.fileMetadata.versionTag)
    throw new Error('Version conflict');

  if (
    !file.fileId ||
    !file.serverMetadata?.accessControlList ||
    !file.fileMetadata.appData.content.id
  )
    throw new Error(`[DotYouCore-js] PostProvider: fileId is required to update a post`);

  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getIdentity();

  let runningVersionTag: string = file.fileMetadata.versionTag;
  const existingMediaFiles =
    (existingAndNewMediaFiles?.filter((f) => 'key' in f) as MediaFile[]) ||
    file.fileMetadata.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY) ||
    [];

  const newMediaFiles: NewMediaFile[] =
    (existingAndNewMediaFiles?.filter(
      (f) => 'file' in f && f.file instanceof Blob
    ) as NewMediaFile[]) || [];

  const oldMediaFiles: MediaFile[] =
    file.fileMetadata.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY) || [];

  // Discover deleted files:
  const deletedMediaFiles: MediaFile[] = [];
  for (let i = 0; oldMediaFiles && i < oldMediaFiles?.length; i++) {
    const oldMediaFile = oldMediaFiles[i];
    if (!existingMediaFiles?.find((f) => f.key === oldMediaFile.key)) {
      deletedMediaFiles.push(oldMediaFile);
    }
  }

  // Remove the payloads that are removed from the post
  if (deletedMediaFiles.length) {
    for (let i = 0; i < deletedMediaFiles.length; i++) {
      const mediaFile = deletedMediaFiles[i];
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

  // When all media is removed from the post, remove the preview thumbnail
  if (oldMediaFiles.length === deletedMediaFiles.length)
    file.fileMetadata.appData.previewThumbnail = undefined;

  // Process new files:
  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];
  let previewThumbnail: EmbeddedThumb | undefined;
  for (let i = 0; newMediaFiles && i < newMediaFiles.length; i++) {
    const newMediaFile = newMediaFiles[i];
    const payloadKey = `${POST_MEDIA_PAYLOAD_KEY}${oldMediaFiles.length + i}`;

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
    existingMediaFiles.push({
      fileId: file.fileId,
      key: payloadKey,
      contentType: newMediaFile.file.type,
    });
    previewThumbnail = previewThumbnail || tinyThumb;
  }

  // Append new files:
  if (payloads.length) {
    const appendInstructionSet: AppendInstructionSet = {
      targetFile: {
        fileId: file.fileId as string,
        targetDrive: targetDrive,
      },
      versionTag: runningVersionTag,
    };

    runningVersionTag = (
      await appendDataToFile(
        dotYouClient,
        header?.fileMetadata.isEncrypted ? header.sharedSecretEncryptedKeyHeader : undefined,
        appendInstructionSet,
        payloads,
        thumbnails
      )
    ).newVersionTag;
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

  const encrypt = !(
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata.accessControlList?.requiredSecurityGroup === SecurityGroupType.Authenticated
  );
  file.fileMetadata.isEncrypted = encrypt;
  file.fileMetadata.versionTag = runningVersionTag;
  const result = await uploadPostHeader(dotYouClient, file, channelId, targetDrive);
  if (!result) throw new Error(`[DotYouCore-js] PostProvider: Post update failed`);

  return result;
};

export const appendPostMedia = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  file: Blob
) => {
  const header = await getFileHeader(dotYouClient, targetDrive, fileId);
  if (!header) throw new Error('Cannot append to a file that does not exist');

  const appendInstructionSet: AppendInstructionSet = {
    targetFile: {
      fileId: fileId,
      targetDrive: targetDrive,
    },
    versionTag: header.fileMetadata.versionTag,
  };

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

  const payloadKey = `${POST_MEDIA_PAYLOAD_KEY}${header.fileMetadata.payloads.length + 1}`;
  const { additionalThumbnails, tinyThumb } = await createThumbnails(file, payloadKey);
  payloads.push({
    payload: file,
    key: payloadKey,
    previewThumbnail: tinyThumb,
  });

  thumbnails.push(...additionalThumbnails);
  console.log('payloads', payloads);
  const response = await appendDataToFile(
    dotYouClient,
    header?.fileMetadata.isEncrypted ? header.sharedSecretEncryptedKeyHeader : undefined,
    appendInstructionSet,
    payloads,
    thumbnails
  );

  return { ...response, fileKey: payloadKey };
};

export const removePostMedia = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  versionTag: string
) => {
  const response = await deletePayload(
    dotYouClient,
    targetDrive,
    fileId as string,
    fileKey,
    versionTag
  );
  return response;
};
