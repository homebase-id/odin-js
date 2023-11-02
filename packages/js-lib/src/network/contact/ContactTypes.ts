import { ImageContentType } from '../../../core';
import { TargetDrive, ThumbSize } from '../../core/DriveData/File/DriveFileTypes';

export class ContactConfig {
  static readonly ContactFileType: number = 100;

  // System Drive (Alias and Type are static and will never change)
  static readonly ContactTargetDrive: TargetDrive = {
    alias: '2612429d1c3f037282b8d42fb2cc0499',
    type: '70e92f0f94d05f5c7dcd36466094f3a5',
  };
}

export interface ContactDataImage extends ThumbSize {
  contentType: ImageContentType;
  content: string;
  url?: string;
}

export interface ContactFile {
  // Meta data
  odinId?: string;
  id?: string;
  fileId?: string;
  versionTag?: string;
  source: 'contact' | 'public' | 'user';

  // Contact data
  name?: { displayName: string; givenName?: string; additionalName?: string; surname?: string };
  location?: { city?: string; country?: string };
  phone?: { number: string };
  email?: { email: string };
  birthday?: { date: string };
  imageFileId?: string;
}
export interface RawContact extends ContactFile {
  image?: ContactDataImage;
}

export interface ContactVm {
  id?: string;

  name?: { displayName: string; givenName?: string; additionalName?: string; surname?: string };
  location?: { city?: string; country?: string };
  phone?: { number: string };
  email?: { email: string };
  birthday?: { date: string };
  imageFileId?: string;
  imageUrl?: string;

  odinId?: string;
  source: 'contact' | 'public' | 'user';
}
