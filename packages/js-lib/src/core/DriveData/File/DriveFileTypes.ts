import { AccessControlList } from '../Upload/DriveUploadTypes';

export type SystemFileType = 'Standard' | 'Comment';

export interface FileMetadata<T = string> {
  created: number;
  globalTransitId?: string;
  updated: number;
  contentType: string;
  isEncrypted: boolean;
  senderOdinId: string;
  appData: AppFileMetaData<T>;
  reactionPreview?: ReactionPreview;
  versionTag: string;

  payloads: PayloadDesriptor[];
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

export type ThumbSize = ImageSize;

// Thumb that gets embedded; E.g: previewThumbnail
export interface EmbeddedThumb extends ThumbSize {
  contentType: ContentType;
  content: string;
}

// Thumb that gets appended; E.g: additionalThumbnails
export interface ThumbnailFile extends ThumbSize {
  key: string;
  payload: File | Blob;
}

export interface PayloadFile {
  key: string;
  payload: File | Blob;
}

type None = 0;
type Archived = 1;
type Removed = 2;

export type ArchivalStatus = None | Archived | Removed | number;

export interface AppFileMetaData<T = string> {
  fileType: number;
  dataType: number;
  groupId?: string;
  userDate?: number;
  tags: string[] | null;
  uniqueId?: string;
  content: T;
  previewThumbnail?: EmbeddedThumb;
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
    content: string;
    reactions: { key: string; count: string; reactionContent: string }[];
  }[];
  reactions: Record<string, { key: string; count: string; reactionContent: string }>;
  totalCommentCount: number;
}

export interface TargetDrive {
  alias: string;
  type: string;
}

export interface PayloadDesriptor {
  key: string;
  contentType: ContentType;
  bytesWritten: number;
  lastModified: number;
  thumbnails: ThumbSize[];
}
