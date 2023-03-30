import { ThumbSize, EmbeddedThumb } from '../DriveData/DriveTypes';

export type ThumbnailMeta = {
  naturalSize: { width: number; height: number };
  sizes?: ThumbSize[];
  url: string;
};

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

export interface ThumbnailInstruction {
  quality: number;
  width: number;
  height: number;
}

export class MediaConfig {
  public static readonly MediaFileType = 0;
}
