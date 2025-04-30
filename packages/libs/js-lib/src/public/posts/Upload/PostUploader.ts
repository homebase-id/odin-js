import { DotYouClient } from '../../../core/DotYouClient';
import { patchFile, uploadFile } from '../../../core/DriveData/Upload/DriveFileUploader';
import {
  PriorityOptions,
  ScheduleOptions,
  SendContents,
  UpdateInstructionSet,
  UpdateResult,
  UploadInstructionSet,
  UploadResult,
} from '../../../core/DriveData/Upload/DriveUploadTypes';
import { SecurityGroupType } from '../../../core/DriveData/File/DriveFileTypes';
import { GenerateKeyHeader } from '../../../core/DriveData/Upload/UploadHelpers';
import { DEFAULT_PAYLOAD_KEY } from '../../../core/constants';
import {
  HomebaseFile,
  NewHomebaseFile,
  EmbeddedThumb,
  PayloadFile,
  ThumbnailFile,
  getFileHeader,
  NewMediaFile,
  MediaFile,
  decryptKeyHeader,
} from '../../../core/core';
import { getNewId, getRandom16ByteArray, toGuidId } from '../../../helpers/DataUtil';
import { GetTargetDriveFromChannelId } from '../Channel/PostChannelManager';
import { getPost } from '../PostProvider';
import { PostContent } from '../PostTypes';
import { makeGrid } from '../../../helpers/ImageMerger';
import { LinkPreview } from '../../../media/media';
import {
  getFileHeaderBytesOverPeerByGlobalTransitId,
  uploadFileOverPeer,
} from '../../../peer/peer';
import { TransitInstructionSet, TransitUploadResult } from '../../../peer/peerData/PeerTypes';

import {
  getPayloadForLinkPreview,
  getPayloadsAndThumbnailsForNewPostMedia,
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
    throw new Error('[odin-js] PostUploader: ACL is required to save a post');

  if (!file.fileMetadata.appData.content.authorOdinId)
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getHostIdentity();

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
    file.fileMetadata.appData.content.authorOdinId = dotYouClient.getHostIdentity();

  // Delete embeddedPost of embeddedPost (we don't want to embed an embed)
  if (file.fileMetadata.appData.content.embeddedPost) {
    delete (file.fileMetadata.appData.content.embeddedPost as PostContent)['embeddedPost'];
  }

  if (file.fileId) {
    if (linkPreviews?.length) {
      throw new Error(
        '[odin-js] PostUploader: Changing Link previews are not supported for post updates'
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
        '[odin-js] PostUploader: Cannot upload a new post with an existing media file. Use updatePost instead'
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
  } = await getPayloadsAndThumbnailsForNewPostMedia(newMediaFiles, aesKey, { onUpdate });

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
    file.fileMetadata.appData.content.slug = `${file.fileMetadata.appData.content.slug
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

    if (!result) throw new Error(`[odin-js] PostUploader: Upload failed`);
    return result;
  } else {
    const transitInstructionSet: TransitInstructionSet = {
      transferIv: getRandom16ByteArray(),
      remoteTargetDrive: targetDrive,
      schedule: ScheduleOptions.SendLater,
      priority: PriorityOptions.Medium,
      recipients: [odinId],
    };

    const result = await uploadFileOverPeer(
      dotYouClient,
      transitInstructionSet,
      metadata,
      payloads,
      thumbnails,
      encrypt,
      { aesKey }
    );

    if (!result) throw new Error(`[odin-js] PostUploader: Upload over peer failed`);
    return result;
  }
};

const updatePost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  remoteOdinId: string | undefined,
  file: HomebaseFile<T>,
  channelId: string,
  existingAndNewMediaFiles?: (NewMediaFile | MediaFile)[],
  onVersionConflict?: () => void,
  onUpdate?: (progress: number) => void
): Promise<UploadResult | UpdateResult> => {
  const odinId = remoteOdinId === dotYouClient.getHostIdentity() ? undefined : remoteOdinId;

  const targetDrive = GetTargetDriveFromChannelId(channelId);
  const header = odinId
    ? await getFileHeaderBytesOverPeerByGlobalTransitId(
      dotYouClient,
      odinId,
      targetDrive,
      file.fileMetadata.globalTransitId as string
    )
    : await getFileHeader(dotYouClient, targetDrive, file.fileId as string);

  if (!header) throw new Error('[odin-js] PostUploader: Cannot update a post that does not exist');

  if (header?.fileMetadata.versionTag !== file.fileMetadata.versionTag) {
    if (odinId) {
      // There's a conflict, but we will just force ahead
      file.fileMetadata.versionTag = header.fileMetadata.versionTag;
    } else {
      throw new Error('[odin-js] PostUploader: Version conflict');
    }
  }
  if (
    !file.fileId ||
    !file.serverMetadata?.accessControlList ||
    !file.fileMetadata.appData.content.id
  ) {
    throw new Error(`[odin-js] PostUploader: File is missing required data to update a post`);
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

  return await patchPost(
    dotYouClient,
    odinId,
    file,
    channelId,
    newMediaFiles,
    deletedMediaFiles,
    onUpdate
  );
};

const patchPost = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string | undefined,
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
    file.fileMetadata.appData.content.slug = `${file.fileMetadata.appData.content.slug
      }-${new Date().getTime()}`;
  }

  const payloads: PayloadFile[] = [];
  const thumbnails: ThumbnailFile[] = [];

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
  } = await getPayloadsAndThumbnailsForNewPostMedia(
    newMediaFiles || [],
    decryptedKeyHeader?.aesKey,
    {
      onUpdate,
    }
  );

  payloads.push(...newMediaPayloads);
  thumbnails.push(...newMediaThumbnails);

  const previewThumbnail: EmbeddedThumb | undefined =
    previewThumbnails?.length >= 2 ? await makeGrid(previewThumbnails) : previewThumbnails[0];

  const { metadata, defaultPayload } = await getUploadFileMetadata(odinId, file, previewThumbnail);
  if (defaultPayload) payloads.push(defaultPayload);

  const deletedPayloads =
    deletedMediaFiles?.map((payload) => {
      return { key: payload.key };
    }) || [];

  if (
    !defaultPayload &&
    file.fileMetadata?.payloads?.some((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)
  ) {
    deletedPayloads.push({
      key: DEFAULT_PAYLOAD_KEY,
    });
  }

  const instructionSet: UpdateInstructionSet = odinId
    ? {
      transferIv: getRandom16ByteArray(),
      locale: 'peer',
      file: {
        globalTransitId: file.fileMetadata.globalTransitId as string,
        targetDrive,
      },
      versionTag: file.fileMetadata.versionTag,
      recipients: [odinId],
    }
    : {
      transferIv: getRandom16ByteArray(),
      locale: 'local',
      file: {
        fileId: file.fileId,
        targetDrive,
      },
      versionTag: file.fileMetadata.versionTag,
    };

  const updateResult = await patchFile(
    dotYouClient,
    encryptedKeyHeader,
    instructionSet,
    metadata,
    payloads,
    thumbnails,
    deletedPayloads,
    undefined
  );

  if (!updateResult) throw new Error(`[PostUploader]: Post update failed`);
  return updateResult;
};
