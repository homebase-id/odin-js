import { FileQueryParams, GetBatchQueryResultOptions } from '../../core/DriveData/Drive/DriveTypes';
import {
  PriorityOptions,
  ScheduleOptions,
  TransferUploadStatus,
} from '../../core/DriveData/Upload/DriveUploadTypes';
import { TargetDrive, SystemFileType } from '../../core/core';

export interface TransitQueryBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
  odinId: string;
}

export interface TransitInstructionSet {
  transferIv: Uint8Array;
  overwriteGlobalTransitFileId?: string | null;
  remoteTargetDrive?: TargetDrive;
  schedule?: ScheduleOptions;
  priority?: PriorityOptions;
  recipients: string[];
  systemFileType?: SystemFileType;
}

export interface TransitUploadResult {
  recipientStatus: { [key: string]: TransferUploadStatus };
  remoteGlobalTransitIdFileIdentifier: {
    globalTransitId: string;
    targetDrive: TargetDrive;
  };
}
