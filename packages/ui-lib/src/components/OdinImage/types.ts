import { SystemFileType, TargetDrive } from '@homebase-id/js-lib/core';

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
  probablyEncrypted?: boolean;

  // Url params
  preferObjectUrl?: boolean;
}

export interface ImageEvents {
  onError?: () => void;
}
