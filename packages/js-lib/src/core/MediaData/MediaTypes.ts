import {
  ThumbSize,
  EmbeddedThumb,
  ImageContentType,
  ArchivalStatus,
} from '../DriveData/DriveTypes';
import { TransitOptions } from '../DriveData/DriveUploadTypes';

export type ThumbnailMeta = {
  naturalSize: { width: number; height: number };
  sizes?: ThumbSize[];
  url: string;
};

export interface MediaUploadMeta {
  tag?: string | undefined | string[];
  uniqueId?: string;
  fileId?: string;
  versionTag?: string;
  type?: ImageContentType;
  transitOptions?: TransitOptions;
  allowDistribution?: boolean;
  userDate?: number;
  archivalStatus?: ArchivalStatus;
}

export interface MediaUploadResult {
  fileId: string;
}

export interface VideoUploadResult extends MediaUploadResult {
  type: 'video';
}

export interface ImageUploadResult extends MediaUploadResult {
  type: 'image';
  previewThumbnail: EmbeddedThumb;
}

export interface ImageMetadata {
  description?: string;
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
  };
  captureDetails?: {
    exposureTime?: string;
    fNumber?: string;
    iso?: number;
    focalLength?: string;
  };
}

export interface VideoMetadata {
  mimeType: string;
  fileSize: number;
  duration: number;
  segmentMap: { offset: number; samples: number }[];
}

export interface ThumbnailInstruction {
  quality: number;
  width: number;
  height: number;
}

export class MediaConfig {
  public static readonly MediaFileType = 0;
}
