import { AccessControlList } from './DriveUploadTypes';

export type SystemFileType = 'Standard' | 'Comment';

export interface FileMetadata {
  created: number;
  globalTransitId?: string;
  updated: number;
  contentType: string;
  payloadIsEncrypted: boolean;
  senderOdinId: string;
  payloadSize: number;
  originalRecipientList: string[];
  appData: AppFileMetaData;
  reactionPreview?: ReactionPreview;
  versionTag: string;
}

export interface ServerMetaData {
  doNotIndex: boolean;
  allowDistribution: boolean;
  accessControlList: AccessControlList;
}

export interface ImageSize {
  pixelHeight: number;
  pixelWidth: number;
}

export interface ThumbSize extends ImageSize {
  contentType: ImageContentType;
}

// Thumb that gets embedded; E.g: previewThumbnail
export interface EmbeddedThumb extends ThumbSize {
  content: string;
}

// Thumb that gets appended; E.g: additionalThumbnails
export interface ThumbnailFile extends ThumbSize {
  payload: Uint8Array;
}

type None = 0;
type Archived = 1;
type Removed = 2;

export type ArchivalStatus = None | Archived | Removed | number;

export interface AppFileMetaData {
  fileType: number;
  dataType: number;
  groupId?: string;
  userDate?: number;
  tags: string[] | null;
  uniqueId?: string;
  contentIsComplete: boolean;
  jsonContent: string;
  previewThumbnail?: EmbeddedThumb;
  additionalThumbnails?: ThumbSize[];
  archivalStatus?: ArchivalStatus;
}

export interface ExternalFileIdentifier {
  fileId: string;
  targetDrive: TargetDrive;
}

export interface GlobalTransitIdFileIdentifier {
  globalTransitId: string;
  targetDrive: TargetDrive;
}
export type ImageContentType =
  | 'image/webp'
  | 'image/png'
  | 'image/bmp'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/svg+xml';

export type ContentType = ImageContentType | string;

export interface ReactionPreview {
  comments: {
    created: number;
    updated: number;
    fileId: string;
    isEncrypted: boolean;
    odinId: string;
    jsonContent: string;
    reactions: { key: string; count: string; reactionContent: string }[];
  }[];
  reactions: Record<string, { key: string; count: string; reactionContent: string }>;
  totalCommentCount: number;
}

export interface TargetDrive {
  alias: string;
  type: string;
}
