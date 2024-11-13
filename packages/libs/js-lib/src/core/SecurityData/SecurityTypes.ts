import { DriveGrant } from '../../network/circleNetwork/CircleDataTypes';
import { PermissionSet } from '../DriveData/Drive/DriveTypes';

export interface SecurityCaller {
  odinId?: string;
  securityLevel: 'connected' | 'anonymous' | 'owner' | undefined;
  isGrantedConnectedIdentitiesSystemCircle?: boolean;
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
