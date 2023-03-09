import { ThumbSize, EmbeddedThumb } from '../DriveData/DriveTypes';

export type ThumbnailMeta = {
  naturalSize: { width: number; height: number };
  sizes?: ThumbSize[];
  url: string;
};

export interface ImageUploadResult {
  fileId: string;
  previewThumbnail: EmbeddedThumb;
}

export interface ThumbnailInstruction {
  quality: number;
  width: number;
  height: number;
}
