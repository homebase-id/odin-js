import { TransitOptions } from '../core/DriveData/Upload/DriveUploadTypes';
import { ImageSize, ImageContentType, ArchivalStatus, EmbeddedThumb } from '../core/core';

export type ThumbnailMeta = {
  naturalSize: { width: number; height: number };
  sizes?: ImageSize[];
  url: string;
  contentType?: ImageContentType;
};

export interface MediaUploadMeta {
  tag?: string | undefined | string[];
  uniqueId?: string;
  fileId?: string;
  versionTag?: string;
  transitOptions?: TransitOptions;
  allowDistribution?: boolean;
  userDate?: number;
  archivalStatus?: ArchivalStatus;
}

export interface MediaUploadResult {
  fileId: string;
  fileKey: string;
  previewThumbnail?: EmbeddedThumb;
}

export interface VideoUploadResult extends MediaUploadResult {
  type: 'video';
}

export interface ImageUploadResult extends MediaUploadResult {
  type: 'image';
}

export interface ImageMetadata {
  description?: string;
  originalFileName?: string;
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
    geolocation?: {
      latitude: number;
      longitude: number;
      altitude?: number;
      speed?: number;
      direction?: number;
    };
  };
}

export interface BaseVideoMetadata {
  mimeType: string;
  isSegmented: boolean;
  isDescriptorContentComplete?: boolean;
  fileSize?: number;
  key?: string;
  duration: number;
}

export interface PlainVideoMetadata extends BaseVideoMetadata {
  isSegmented: false;
}

export interface SegmentedVideoMetadata extends BaseVideoMetadata {
  isSegmented: true;
  codec: string;
}

export interface HlsVideoMetadata extends BaseVideoMetadata {
  isSegmented: true;
  hlsPlaylist: string;
}

export interface ThumbnailInstruction {
  quality: number;
  maxPixelDimension: number;
  maxBytes: number;
  type?: 'webp' | 'png' | 'bmp' | 'jpeg' | 'gif';
}

export class MediaConfig {
  public static readonly MediaFileType = 0;
}
