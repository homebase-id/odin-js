import {
  BaseUploadInstructionSet,
  PriorityOptions,
  PushNotificationOptions,
  ScheduleOptions,
  TransferUploadStatus,
} from '../../core/DriveData/Upload/DriveUploadTypes';
import { KeyHeader, TargetDrive } from '../../core/core';

export interface TransitInstructionSet
  extends Omit<BaseUploadInstructionSet, 'storageOptions' | 'transitOptions'> {
  transferIv: Uint8Array;
  overwriteGlobalTransitFileId?: string | null;
  remoteTargetDrive?: TargetDrive;
  schedule?: ScheduleOptions;
  priority?: PriorityOptions;

  recipients: string[];

  notificationOptions?: PushNotificationOptions;
}

export interface TransitUploadResult {
  recipientStatus: { [key: string]: TransferUploadStatus };
  remoteGlobalTransitIdFileIdentifier: {
    globalTransitId: string;
    targetDrive: TargetDrive;
  };
  keyHeader: KeyHeader | undefined;
}
