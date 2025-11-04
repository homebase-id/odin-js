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
import { BlogConfig, PostContent, postTypeToDataType, Article, ReadTimeStats } from '../PostTypes';
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
  const TEXT_FIELD_BYTE_LIMIT = 200; // simple 200-byte trimming per spec

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
  let headerObj: Partial<PostContent> & Partial<Omit<Article, 'type'>> = {
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

  // Article specifics: include trimmed abstract; include readingTimeStats; include body if small
  if (isArticle) {
    const article = fullContent;
    if (typeof article.abstract === 'string') {
      headerObj.abstract = trimToBytes(article.abstract, TEXT_FIELD_BYTE_LIMIT);
    }
    if (article.readingTimeStats !== undefined) {
      headerObj.readingTimeStats = article.readingTimeStats;
    }
    if (article.body !== undefined) {
      const bodyJson = stringify(article.body);
      if (stringToUint8Array(bodyJson).length <= TEXT_FIELD_BYTE_LIMIT) {
        headerObj.body = article.body;
      }
    }
  }

  // Include heavy media/embedded content in header initially
  if (fullContent.primaryMediaFile !== undefined) {
    headerObj.primaryMediaFile = fullContent.primaryMediaFile;
  }
  if (fullContent.embeddedPost !== undefined) {
    headerObj.embeddedPost = fullContent.embeddedPost;
  }

  // Helper to check fit
  const fitsInHeader = (obj: object) =>
    uint8ArrayToBase64(stringToUint8Array(stringify(obj))).length < MAX_HEADER_CONTENT_BYTES;

  // If too big, try trimming caption to 200 bytes with ellipsis
  if (!fitsInHeader(headerObj) && typeof headerObj.caption === 'string') {
    headerObj.caption = trimToBytes(headerObj.caption as string, TEXT_FIELD_BYTE_LIMIT);
  }

  // If still too big, move heavy fields (embeddedPost, primaryMediaFile, readingTimeStats) to default payload
  const defaultPayloadObj: Partial<PostContent> & { readingTimeStats?: ReadTimeStats } = {};
  const moveEmbeddedPost = () => {
    if (headerObj.embeddedPost !== undefined) {
      defaultPayloadObj.embeddedPost = headerObj.embeddedPost;
      delete headerObj.embeddedPost;
    }
  };
  const movePrimaryMediaFile = () => {
    if (headerObj.primaryMediaFile !== undefined) {
      defaultPayloadObj.primaryMediaFile = headerObj.primaryMediaFile;
      delete headerObj.primaryMediaFile;
    }
  };
  const moveReadingTimeStats = () => {
    const h = headerObj as Partial<Omit<Article, 'type'>>;
    if (h.readingTimeStats !== undefined) {
      defaultPayloadObj.readingTimeStats = h.readingTimeStats;
      delete h.readingTimeStats;
    }
  };

  if (!fitsInHeader(headerObj)) {
    moveEmbeddedPost();
  }
  if (!fitsInHeader(headerObj)) {
    movePrimaryMediaFile();
  }
  if (!fitsInHeader(headerObj)) {
    moveReadingTimeStats();
  }

  // Do not drop critical metadata (sourceUrl, reactAccess, isCollaborative)

  // Final fallback to minimal header to guarantee fit
  let fellBackToMinimalHeader = false;
  if (!fitsInHeader(headerObj)) {
    fellBackToMinimalHeader = true;
    headerObj = { channelId: fullContent.channelId, type: fullContent.type };
  }

  const headerContent = stringify(headerObj);

  // Default payload
  // If we fell back to minimal header, include the entire content in the default payload
  // Otherwise, include only the fields we moved out of the header (embeddedPost/primaryMediaFile/readingTimeStats)
  const defaultPayload: PayloadFile | null = fellBackToMinimalHeader
    ? {
      key: DEFAULT_PAYLOAD_KEY,
      payload: new OdinBlob([stringify(fullContent)], { type: 'application/json' }),
    }
    : Object.keys(defaultPayloadObj).length > 0
      ? {
        key: DEFAULT_PAYLOAD_KEY,
        payload: new OdinBlob([stringify(defaultPayloadObj)], { type: 'application/json' }),
      }
      : null;

  // Text payload: include full text fields (body, abstract, caption, captionAsRichText) and type
  const textPayloadObj: Record<string, unknown> = { type: fullContent.type };
  textPayloadObj.caption = fullContent.caption;
  if (fullContent.captionAsRichText !== undefined) {
    textPayloadObj.captionAsRichText = fullContent.captionAsRichText;
  }
  if (isArticle) {
    const article = fullContent;
    textPayloadObj.abstract = article.abstract;
    textPayloadObj.body = article.body;
  }

  const additionalPayloads: PayloadFile[] = [
    {
      key: POST_FULL_TEXT_PAYLOAD_KEY,
      payload: new OdinBlob([stringify(textPayloadObj)], { type: 'application/json' }),
    },
  ];

  return { headerContent, defaultPayload, additionalPayloads };
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
