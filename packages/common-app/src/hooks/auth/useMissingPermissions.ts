import {
  stringifyToQueryParams,
  getUniqueDrivesWithHighestPermission,
  stringGuidsEqual,
} from '@youfoundation/js-lib/helpers';
import { ALL_CONNECTIONS_CIRCLE_ID, AppPermissionType } from '@youfoundation/js-lib/network';
import { useSecurityContext } from '../securityContext/useSecurityContext';
import { useDotYouClient } from './useDotYouClient';

const getExtendAuthorizationUrl = (
  identity: string,
  appId: string,
  drives: { a: string; t: string; n: string; d: string; p: number }[],
  permissionKeys: number[],
  needsAllConnected: boolean,
  returnUrl: string
) => {
  const params = {
    appId: appId,
    d: JSON.stringify(drives),
    p: permissionKeys.join(','),
    c: needsAllConnected ? ALL_CONNECTIONS_CIRCLE_ID : null,
  };

  return `https://${identity}/owner/appupdate?${stringifyToQueryParams(
    params
  )}&return=${encodeURIComponent(returnUrl)}`;
};

export const useMissingPermissions = ({
  appId,
  drives,
  permissions,
  needsAllConnected,
}: {
  appId: string;
  drives: {
    a: string;
    t: string;
    n: string;
    d: string;
    p: number;
  }[];
  permissions: AppPermissionType[];
  needsAllConnected?: boolean;
}) => {
  const { data: context } = useSecurityContext().fetch;
  const identity = useDotYouClient().getIdentity();

  if (!context || !identity) return;

  const driveGrants = context?.permissionContext.permissionGroups.flatMap(
    (group) => group.driveGrants
  );
  const uniqueDriveGrants = driveGrants ? getUniqueDrivesWithHighestPermission(driveGrants) : [];

  const permissionKeys = context?.permissionContext.permissionGroups.flatMap(
    (group) => group.permissionSet.keys
  );

  const missingDrives = drives.filter((drive) => {
    const matchingGrants = uniqueDriveGrants.filter(
      (grant) =>
        stringGuidsEqual(grant.permissionedDrive.drive.alias, drive.a) &&
        stringGuidsEqual(grant.permissionedDrive.drive.type, drive.t)
    );

    const hasAccess = matchingGrants.some((grant) => {
      const allPermissions = grant.permissionedDrive.permission.reduce((a, b) => a + b, 0);
      return allPermissions >= drive.p;
    });

    return !hasAccess;
  });

  const missingPermissions = permissions?.filter((key) => permissionKeys?.indexOf(key) === -1);

  const hasAllConnectedCircle = context?.caller.isGrantedConnectedIdentitiesSystemCircle;
  const missingAllConnectedCircle = (needsAllConnected && !hasAllConnectedCircle) || false;

  if (missingDrives.length === 0 && missingPermissions.length === 0 && !missingAllConnectedCircle)
    return;

  const extendPermissionUrl = getExtendAuthorizationUrl(
    identity,
    appId,
    missingDrives,
    missingPermissions,
    missingAllConnectedCircle,
    window.location.href
  );

  return extendPermissionUrl;
};
