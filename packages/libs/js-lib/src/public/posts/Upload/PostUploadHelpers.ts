import { DotYouClient } from '../../../core/DotYouClient';
import {
  HomebaseFile,
  EmbeddedThumb,
  PayloadFile,
  NewMediaFile,
  NewHomebaseFile,
  UploadFileMetadata,
  DEFAULT_PAYLOAD_KEY,
  SecurityGroupType,
} from '../../../core/core';
import {
  base64ToUint8Array,
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
  toGuidId,
} from '../../../helpers/DataUtil';
import { getPostBySlug } from '../PostProvider';
import { BlogConfig, PostContent, postTypeToDataType } from '../PostTypes';
import { createThumbnails, LinkPreview, LinkPreviewDescriptor } from '../../../media/media';
import { getPostBySlugOverPeer } from '../../../peer/peer';
import { POST_LINKS_PAYLOAD_KEY } from './PostUploader';
import { getPayloadsAndThumbnailsForNewMedia } from '../../../helpers/PayloadAndThumbnailGenerator';
const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

const POST_MEDIA_PAYLOAD_KEY = 'pst_mdi';

export const getPayloadsAndThumbnailsForNewPostMedia = async (
  mediaFiles: NewMediaFile[],
  aesKey: Uint8Array | undefined,
  options?: {
    onUpdate?: (progress: number) => void;
    keyPrefix?: string;
    keyIndex?: number;
  }
) => {
  return getPayloadsAndThumbnailsForNewMedia(mediaFiles, aesKey, {
    keyPrefix: POST_MEDIA_PAYLOAD_KEY,
    ...options,
  });
};

export const getPayloadForLinkPreview = async (
  linkPreviews: LinkPreview[] | undefined
): Promise<PayloadFile | null> => {
  if (!linkPreviews || linkPreviews.length === 0) return null;
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

  return {
    key: POST_LINKS_PAYLOAD_KEY,
    payload: new Blob([stringToUint8Array(JSON.stringify(linkPreviews))], {
      type: 'application/json',
    }),
    descriptorContent,
    previewThumbnail: tinyThumb,
  };
};

export const hasConflictingSlug = async <T extends PostContent>(
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: HomebaseFile<T> | NewHomebaseFile<T>,
  channelId: string
) => {
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

  if (!existingPostWithThisSlug) {
    return false;
  }

  return (
    !stringGuidsEqual(
      existingPostWithThisSlug?.fileMetadata.appData.content.id,
      file.fileMetadata.appData.content.id
    ) &&
    (odinId
      ? !stringGuidsEqual(
          existingPostWithThisSlug?.fileMetadata.globalTransitId,
          file?.fileMetadata.globalTransitId
        )
      : !stringGuidsEqual(existingPostWithThisSlug?.fileId, file.fileId))
  );
};

export const getUploadFileMetadata = async <T extends PostContent>(
  odinId: string | undefined,
  file: HomebaseFile<T> | NewHomebaseFile<T>,
  previewThumbnail?: EmbeddedThumb | undefined
) => {
  let defaultPayload: PayloadFile | null = null;

  const uniqueId = file.fileMetadata.appData.content.slug
    ? toGuidId(file.fileMetadata.appData.content.slug)
    : file.fileMetadata.appData.content.id;

  const encrypt = !(
    file.serverMetadata?.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata?.accessControlList?.requiredSecurityGroup ===
      SecurityGroupType.Authenticated
  );

  const payloadJson: string = jsonStringify64({ ...file.fileMetadata.appData.content });
  const payloadBytes = stringToUint8Array(payloadJson);

  // Set max of 3kb for content so enough room is left for metadata
  const shouldEmbedContent = payloadBytes.length < 3000;

  const content = shouldEmbedContent
    ? payloadJson
    : jsonStringify64({ channelId: file.fileMetadata.appData.content.channelId }); // If the full payload can't be embedded into the header file, at least pass the channelId so when getting, the location is known

  if (!shouldEmbedContent) {
    defaultPayload = {
      key: DEFAULT_PAYLOAD_KEY,
      payload: new OdinBlob([payloadBytes], { type: 'application/json' }),
    };
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
      previewThumbnail: previewThumbnail ?? file.fileMetadata.appData.previewThumbnail,
      userDate: file.fileMetadata.appData.userDate,
      dataType: postTypeToDataType(file.fileMetadata.appData.content.type),
    },
    isEncrypted: encrypt,
    accessControlList: file.serverMetadata?.accessControlList,
  };

  return { metadata, defaultPayload };
};
