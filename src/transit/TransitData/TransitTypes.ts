import {
  FileQueryParams,
  GetBatchQueryResultOptions,
  TargetDrive,
} from '../../core/DriveData/DriveTypes';
import {
  ScheduleOptions,
  SystemFileType,
  TransferStatus,
} from '../../core/DriveData/DriveUploadTypes';

export interface GetFileRequest {
  odinId: string;
  file: {
    targetDrive: TargetDrive;
    fileId: string;
  };
}

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
  recipients: string[];
  systemFileType?: SystemFileType;
}

export interface TransitUploadResult {
  recipientStatus: { [key: string]: TransferStatus };
  remoteGlobalTransitIdFileIdentifier: {
    globalTransitId: string;
    targetDrive: TargetDrive;
  };
}
