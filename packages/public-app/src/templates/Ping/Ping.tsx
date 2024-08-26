import { useSecurityContext } from '@homebase-id/common-app';
import { HardDrive, Persons } from '@homebase-id/common-app/icons';
import { t } from '@homebase-id/common-app';
import {
  getAppPermissionFromNumber,
  getDrivePermissionFromNumber,
  getUniqueDrivesWithHighestPermission,
} from '@homebase-id/js-lib/helpers';

const Ping = () => {
  const { data: securityContext } = useSecurityContext().fetch;
  if (!securityContext) return null;

  const { odinId, securityLevel } = securityContext.caller;
  const grants = securityContext.permissionContext.permissionGroups.flatMap((pg) => pg.driveGrants);
  const uniqueDrivesWithHighestPermission = getUniqueDrivesWithHighestPermission(grants);

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
                        {t(getDrivePermissionFromNumber(grant.permissionedDrive.permission))}
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
                    {t(getAppPermissionFromNumber(key))}
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
