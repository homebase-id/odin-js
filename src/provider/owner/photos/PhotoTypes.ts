import { toGuidId } from '../../core/DataUtil';
import { TargetDrive } from '../../core/DriveData/DriveTypes';

export class PhotoConfig {
  static readonly DriveType: string = toGuidId('photos_drive');
  static readonly PhotoDrive: TargetDrive = {
    alias: toGuidId('standard_photos_drive'),
    type: PhotoConfig.DriveType,
  };
  static readonly FavoriteTag: string = toGuidId('favorite');
}

export interface PhotoFile {
  fileId: string;
  url: string;
}
