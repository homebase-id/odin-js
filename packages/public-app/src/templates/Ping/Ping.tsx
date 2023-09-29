import {
  AppPermissionLevels,
  DriveGrant,
  DrivePermissionType,
} from '@youfoundation/js-lib/network';
import { HardDrive, useSecurityContext } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';

// TODO: Lots of duplicate code here, the ping page shows owner types on the public page;
const drivePermissionLevels = [
  { name: t('None'), value: DrivePermissionType.None },
  { name: t('Reader'), value: DrivePermissionType.Reader },
  { name: t('Writer'), value: DrivePermissionType.Writer },
  { name: t('Editor'), value: DrivePermissionType.Editor },
  { name: t('Commenter'), value: DrivePermissionType.Comment }, // WriteReactionsAndComments
  { name: t('Full'), value: DrivePermissionType.Full }, // Commeter + Editor
];

const connectionPermissionLevels = [
  { name: t('None'), value: AppPermissionLevels.None },
  { name: t('Read Connections'), value: AppPermissionLevels.ReadConnections },
  { name: t('Manage Connection Requests'), value: AppPermissionLevels.ManageConnectionRequests },
  { name: t('Read Circle Members'), value: AppPermissionLevels.ReadCircleMembers },
  { name: t('Read Who I Follow'), value: AppPermissionLevels.ReadWhoIFollow },
  { name: t('Read My Followers'), value: AppPermissionLevels.ReadMyFollowers },
];

const getAccessFromPermissionNumber = (
  value: number,
  permissionLevels: { name: string; value: number }[]
) => {
  return permissionLevels.reduce((prevValue, currValue) => {
    if (currValue.value > prevValue.value && currValue.value <= value) {
      return currValue;
    }

    return prevValue;
  }, permissionLevels[0]);
};

const Ping = () => {
  const { data: securityContext } = useSecurityContext().fetch;
  if (!securityContext) return null;

  const { odinId, securityLevel } = securityContext.caller;
  const grants = securityContext.permissionContext.permissionGroups.flatMap((pg) => pg.driveGrants);
  const uniqueDrivesWithHighestPermission = grants?.reduce((prevValue, grantedDrive) => {
    const existingGrantIndex = prevValue.findIndex(
      (driveGrant) =>
        driveGrant.permissionedDrive.drive.alias === grantedDrive.permissionedDrive.drive.alias &&
        driveGrant.permissionedDrive.drive.type === grantedDrive.permissionedDrive.drive.type
    );

    if (existingGrantIndex !== -1) {
      prevValue[existingGrantIndex].permissionedDrive.permission = Math.max(
        prevValue[existingGrantIndex].permissionedDrive.permission,
        grantedDrive.permissionedDrive.permission
      );
      return prevValue;
    } else {
      return [...prevValue, grantedDrive];
    }
  }, [] as DriveGrant[]);

  const permissionKeys = Array.from(
    new Set(
      securityContext.permissionContext.permissionGroups.flatMap((pg) => pg.permissionSet.keys)
    )
  );

  return (
    <section className="py-5">
      <div className="container mx-auto px-2 sm:px-5">
        <div className="rounded-lg bg-background p-4">
          <h1 className="mb-5 text-2xl">
            {odinId ?? window.location.hostname} ({securityLevel})
          </h1>
          {uniqueDrivesWithHighestPermission?.length ? (
            <div className="mb-5 border-t pt-5">
              <h2 className="mb-2 text-lg">Drives:</h2>
              <ul className="grid grid-flow-row gap-4">
                {uniqueDrivesWithHighestPermission
                  .sort((grantA, grantB) =>
                    grantA.permissionedDrive.drive.alias.localeCompare(
                      grantB.permissionedDrive.drive.alias
                    )
                  )
                  .map((grant) => (
                    <li
                      className="flex flex-row items-center"
                      key={grant.permissionedDrive.drive.alias}
                    >
                      <HardDrive className="mr-4 h-8 w-8 flex-shrink-0" />
                      <span className="mr-5">
                        {
                          getAccessFromPermissionNumber(
                            grant.permissionedDrive.permission,
                            drivePermissionLevels
                          ).name
                        }
                      </span>
                      <span>
                        A: {grant.permissionedDrive.drive.alias}
                        <br />
                        T: {grant.permissionedDrive.drive.type}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {permissionKeys?.length ? (
            <div className="mb-5 border-t pt-5">
              <h2 className="mb-2 text-lg">Permission</h2>
              <ul className="grid grid-flow-row gap-4">
                {permissionKeys.map((key) => (
                  <li key={key} className="flex flex-row items-center">
                    <Persons className="mr-4 h-8 w-8 flex-shrink-0" />
                    {connectionPermissionLevels.find((lvl) => lvl.value === key)?.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default Ping;
