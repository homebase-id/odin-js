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
    };
  };
}

export interface BaseVideoMetadata {
  description?: string;
  mimeType: string;
  fileSize: number;

  isSegmented: boolean;
}

export interface PlainVideoMetadata extends BaseVideoMetadata {
  isSegmented: false;
}

export interface SegmentedVideoMetadata extends BaseVideoMetadata {
  isSegmented: true;
  codec: string;
  duration: number;
  segmentMap: { offset: number; samples: number }[];
}

export interface ThumbnailInstruction {
  quality: number;
  width: number;
  height: number;
  type?: 'webp' | 'png' | 'bmp' | 'jpeg' | 'gif';
}

export class MediaConfig {
  public static readonly MediaFileType = 0;
}
