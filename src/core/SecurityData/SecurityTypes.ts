import { DriveGrant } from '../../owner/circleNetwork/CircleDataTypes';
import { PermissionSet } from '../DriveData/DriveTypes';

export interface SecurityCaller {
  odinId?: string;
  securityLevel: string;
}

export interface PermissionGroup {
  driveGrants: DriveGrant[];
  permissionSet: PermissionSet;
}

export interface PermissionContext {
  permissionGroups: PermissionGroup[];
}

export interface SecurityContex {
  caller: SecurityCaller;
  permissionContext: PermissionContext;
}
