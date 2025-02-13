import {
  stringifyToQueryParams,
  getUniqueDrivesWithHighestPermission,
  drivesEqual,
} from '@homebase-id/js-lib/helpers';
import { AppPermissionType } from '@homebase-id/js-lib/network';
import { useSecurityContext } from '../securityContext/useSecurityContext';
import { getExtendAppRegistrationParams, TargetDriveAccessRequest } from '@homebase-id/js-lib/auth';
import { useDotYouClientContext } from './useDotYouClientContext';

const getExtendAppRegistrationUrl = (
  host: string,
  appId: string,
  drives: TargetDriveAccessRequest[],
  circleDrives: TargetDriveAccessRequest[] | undefined,
  permissionKeys: number[],
  needsAllConnected: boolean,
  returnUrl: string
) => {
  const params = getExtendAppRegistrationParams(
    appId,
    drives,
    circleDrives,
    permissionKeys,
    needsAllConnected,
    returnUrl
  );

  return `${host}/owner/appupdate?${stringifyToQueryParams(params)}`;
};

export const useMissingPermissions = ({
  appId,
  drives,
  circleDrives,
  permissions,
  needsAllConnected,
}: {
  appId: string;
  drives: TargetDriveAccessRequest[];
  circleDrives?: TargetDriveAccessRequest[] | undefined;
  permissions: AppPermissionType[];
  needsAllConnected?: boolean;
}) => {
  const { data: context } = useSecurityContext().fetch;
  const host = useDotYouClientContext().getRoot();

  if (!context || !host) return;

  const driveGrants = context?.permissionContext.permissionGroups.flatMap(
    (group) => group.driveGrants
  );
  const uniqueDriveGrants = driveGrants ? getUniqueDrivesWithHighestPermission(driveGrants) : [];

  const permissionKeys = context?.permissionContext.permissionGroups.flatMap(
    (group) => group.permissionSet.keys
  );

  const missingDrives = drives.filter((drive) => {
    const matchingGrants = uniqueDriveGrants.filter((grant) =>
      drivesEqual(grant.permissionedDrive.drive, drive)
    );

    const requestingPermission = drive.permissions.reduce((a, b) => a + b, 0);
    const hasAccess = matchingGrants.some((grant) => {
      const allPermissions = grant.permissionedDrive.permission.reduce((a, b) => a + b, 0);
      return allPermissions >= requestingPermission;
    });

    return !hasAccess;
  });

  const missingPermissions = permissions?.filter((key) => permissionKeys?.indexOf(key) === -1);

  const hasAllConnectedCircle = context?.caller.isGrantedConnectedIdentitiesSystemCircle;
  const missingAllConnectedCircle = (needsAllConnected && !hasAllConnectedCircle) || false;

  if (missingDrives.length === 0 && missingPermissions.length === 0 && !missingAllConnectedCircle)
    return;

  const extendPermissionUrl = getExtendAppRegistrationUrl(
    host,
    appId,
    missingDrives,
    circleDrives,
    missingPermissions,
    missingAllConnectedCircle,
    window.location.href
  );

  return extendPermissionUrl;
};
