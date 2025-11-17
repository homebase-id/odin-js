import { DotYouClient } from '../../../core/DotYouClient';
import {
  HomebaseFile,
  EmbeddedThumb,
  PayloadFile,
  NewMediaFile,
  NewHomebaseFile,
  UploadFileMetadata,
  SecurityGroupType,
  MAX_HEADER_CONTENT_BYTES,
} from '../../../core/core';
import {
  base64ToUint8Array,
  jsonStringify64,
  stringGuidsEqual,
  stringToUint8Array,
  toGuidId,
  uint8ArrayToBase64,
} from '../../../helpers/DataUtil';
import { getPostBySlug } from '../PostProvider';
import { BlogConfig, PostContent, postTypeToDataType, Article } from '../PostTypes';
import { createThumbnails, LinkPreview, LinkPreviewDescriptor } from '../../../media/media';
import { getPostBySlugOverPeer } from '../../../peer/peer';
import { POST_LINKS_PAYLOAD_KEY } from './PostUploader';
import { POST_FULL_TEXT_PAYLOAD_KEY } from './PostUploader';
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
    ? new Blob([base64ToUint8Array(imageUrl.split(',')[1]).buffer as ArrayBuffer], {
      type: imageUrl.split(';')[0].split(':')[1],
    })
    : undefined;

  const { tinyThumb } = imageBlob
    ? await createThumbnails(imageBlob, '', [])
    : { tinyThumb: undefined };

  return {
    key: POST_LINKS_PAYLOAD_KEY,
    payload: new Blob([JSON.stringify(linkPreviews)], {
      type: 'application/json',
    }),
    descriptorContent,
    previewThumbnail: tinyThumb,
  };
};

// Build header content and payloads for a post according to size constraints and content type rules.
// If full content fits in the header, we embed it fully and return no payloads.
// Otherwise, we place essential/early-load data into the default payload and long-form text into a separate text payload.
export const getPostContentForUpload = <T extends PostContent>(
  file: HomebaseFile<T> | NewHomebaseFile<T>
): { headerContent: string; defaultPayload: PayloadFile | null; additionalPayloads: PayloadFile[] } => {
  const TEXT_FIELD_BYTE_LIMIT = 400; // simple 200-byte trimming per spec

  const fullContent = file.fileMetadata.appData.content as T;

  const stringify = (obj: unknown) => jsonStringify64(obj);
  const base64LengthOfString = (s: string) => uint8ArrayToBase64(stringToUint8Array(s)).length;

  const trimToBytes = (value: string, maxBytes: number) => {
    const bytes = stringToUint8Array(value);
    if (bytes.length <= maxBytes) return value;
    // Make room for ellipsis (3 chars)
    const target = Math.max(0, maxBytes - 3);
    let acc = '';
    let used = 0;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      const chBytes = stringToUint8Array(ch).length;
      if (used + chBytes > target) break;
      acc += ch;
      used += chBytes;
    }
    return acc + '...';
  };

  // Case 1: Full content fits in header
  const fullJson = stringify(fullContent);
  const fullB64Len = base64LengthOfString(fullJson);
  if (fullB64Len < MAX_HEADER_CONTENT_BYTES) {
    return { headerContent: fullJson, defaultPayload: null, additionalPayloads: [] };
  }

  // Case 2: Split across header, default payload, and text payload
  const isArticleContent = (c: PostContent): c is Article => c.type === 'Article';
  const isArticle = isArticleContent(fullContent);

  // Build a header candidate with essential fields
  const headerObj: Partial<PostContent> & Partial<Omit<Article, 'type'>> = {
    id: fullContent.id,
    slug: fullContent.slug,
    channelId: fullContent.channelId,
    reactAccess: fullContent.reactAccess,
    isCollaborative: fullContent.isCollaborative,
    type: fullContent.type,
    sourceUrl: fullContent.sourceUrl,
  };

  // Include full caption first; we may trim later if header doesn't fit
  if (typeof fullContent.caption === 'string') {
    headerObj.caption = fullContent.caption;
  }

  // Tentatively include captionAsRichText; may remove if header doesn't fit
  if (fullContent.captionAsRichText !== undefined) {
    headerObj.captionAsRichText = fullContent.captionAsRichText;
  }

  // Article specifics: include trimmed abstract; include readingTimeStats; include body if small
  // Track what gets trimmed/omitted for payload decisions
  let wasCaptionTrimmed = false;
  let movedCaptionRichToPayload = false;
  let wasAbstractTrimmed = false;
  let bodyIncludedInHeader = false;

  if (isArticle) {
    const article = fullContent;
    if (typeof article.abstract === 'string') {
      const trimmed = trimToBytes(article.abstract, TEXT_FIELD_BYTE_LIMIT);
      headerObj.abstract = trimmed;
      wasAbstractTrimmed = trimmed !== article.abstract;
    }
    if (article.readingTimeStats !== undefined) {
      headerObj.readingTimeStats = article.readingTimeStats;
    }
    if (article.body !== undefined) {
      const bodyJson = stringify(article.body);
      if (stringToUint8Array(bodyJson).length <= TEXT_FIELD_BYTE_LIMIT) {
        headerObj.body = article.body;
        bodyIncludedInHeader = true;
      }
    }
  }

  // Include heavy media/embedded content in header initially
  if (fullContent.primaryMediaFile !== undefined) {
    headerObj.primaryMediaFile = fullContent.primaryMediaFile;
  }
  if (fullContent.embeddedPost !== undefined) {
    // Strip previewThumbnail from each payload descriptor up front to reduce size
    const ep = fullContent.embeddedPost;
    const cleanedPayloads = ep.payloads?.map((p) => {
      return { ...p, previewThumbnail: undefined };
    });
    headerObj.embeddedPost = { ...ep, payloads: cleanedPayloads };
  }

  // Helper to check fit
  const fitsInHeader = (obj: object) =>
    uint8ArrayToBase64(stringToUint8Array(stringify(obj))).length < MAX_HEADER_CONTENT_BYTES;



  // If too big, first try trimming caption
  if (!fitsInHeader(headerObj) && typeof headerObj.caption === 'string') {
    const original = headerObj.caption as string;
    const trimmed = trimToBytes(original, TEXT_FIELD_BYTE_LIMIT);
    if (trimmed !== original) {
      wasCaptionTrimmed = true;
      headerObj.caption = trimmed;
    }
  }

  // If still too big, try removing captionAsRichText from header (will send via payload)
  if (!fitsInHeader(headerObj) && headerObj.captionAsRichText !== undefined) {
    movedCaptionRichToPayload = true;
    delete headerObj.captionAsRichText;
  }

  // If still too big, try limiting embeddedPost payload descriptors to first 6
  if (
    !fitsInHeader(headerObj) &&
    headerObj.embeddedPost?.payloads &&
    headerObj.embeddedPost.payloads.length > 6
  ) {
    headerObj.embeddedPost.payloads = headerObj.embeddedPost.payloads.slice(0, 6);
  }

  if (!fitsInHeader(headerObj) && headerObj.embeddedPost) {
    console.warn('[odin-js] getPostContentForUpload: removing embeddedPost from header due to size');
    throw new Error(`Header content exceeds size limit even after optimizations. Size exceeded by ${uint8ArrayToBase64(stringToUint8Array(stringify(headerObj))).length - MAX_HEADER_CONTENT_BYTES
      } `);
  }


  // Text payload: include only fields that were trimmed or couldn't fit in the header
  const textPayloadObj: Record<string, unknown> = { type: fullContent.type };
  if (wasCaptionTrimmed && fullContent.caption) {
    textPayloadObj.caption = fullContent.caption;
  }
  if (movedCaptionRichToPayload && fullContent.captionAsRichText !== undefined) {
    textPayloadObj.captionAsRichText = fullContent.captionAsRichText;
  }
  if (isArticle) {
    const article = fullContent;
    if (wasAbstractTrimmed) {
      textPayloadObj.abstract = article.abstract;
    }
    if (!bodyIncludedInHeader && article.body !== undefined) {
      textPayloadObj.body = article.body;
    }
  }

  // only add the payload if its not empty
  const isTextPayloadEmpty =
    Object.keys(textPayloadObj).length === 1 && textPayloadObj.type === fullContent.type;

  const additionalPayloads: PayloadFile[] = !isTextPayloadEmpty ? [
    {
      key: POST_FULL_TEXT_PAYLOAD_KEY,
      payload: new OdinBlob([stringify(textPayloadObj)], { type: 'application/json' }),
    },
  ] : [];

  const headerContent = stringify(headerObj);

  return { headerContent, defaultPayload: null, additionalPayloads };
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

  const uniqueId = file.fileMetadata.appData.content.slug
    ? toGuidId(file.fileMetadata.appData.content.slug)
    : file.fileMetadata.appData.content.id;

  const encrypt = !(
    file.serverMetadata?.accessControlList?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    file.serverMetadata?.accessControlList?.requiredSecurityGroup ===
    SecurityGroupType.Authenticated
  );

  // Use the helper to split content into header and payloads
  const { headerContent: content, additionalPayloads, defaultPayload } = getPostContentForUpload(file);

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
      dataType:
        file.fileMetadata.appData.dataType ||
        postTypeToDataType(file.fileMetadata.appData.content.type),
    },
    isEncrypted: encrypt,
    accessControlList: file.serverMetadata?.accessControlList,
  };

  return { metadata, defaultPayload, additionalPayloads };
};
