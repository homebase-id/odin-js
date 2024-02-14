import { SystemFileType, TargetDrive } from '@youfoundation/js-lib/core';

export interface ImageSource {
  // Drive
  odinId?: string;
  targetDrive: TargetDrive;

  // File
  fileId: string | undefined;
  globalTransitId?: string | undefined;

  // Payload
  fileKey: string | undefined;

  // File params
  systemFileType?: SystemFileType;
  lastModified?: number;
}

export interface ImageEvents {
  onError?: () => void;
}
