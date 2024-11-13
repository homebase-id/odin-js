import { t } from '@homebase-id/common-app';
import { useDrive } from '../../../hooks/drives/useDrive';
import { DriveGrantRequest } from '../../../provider/app/AppManagementProviderTypes';
import { Arrow, HardDrive } from '@homebase-id/common-app/icons';
import { LoadingBlock } from '@homebase-id/common-app';
import { getDrivePermissionFromNumber } from '@homebase-id/js-lib/helpers';

const DrivePermissionRequestView = ({
  driveGrant,
  existingGrant,
  permissionTree,
  className,
}: {
  driveGrant: DriveGrantRequest;
  existingGrant?: DriveGrantRequest;
  permissionTree?: string;
  className?: string;
}) => {
  const { data: drive, isLoading: driveLoading } = useDrive({
    targetDrive: driveGrant.permissionedDrive.drive,
  }).fetch;

  const isNew = !drive?.name;

  const totalExistingPermissions = existingGrant?.permissionedDrive.permission.reduce(
    (a, b) => a + b,
    0
  );
  const totalNewPermission = driveGrant?.permissionedDrive.permission.reduce((a, b) => a + b, 0);

  return (
    <div
      key={`${driveGrant.permissionedDrive.drive.alias}-${driveGrant.permissionedDrive.drive.type}`}
      className={`flex flex-row ${className}`}
      title={permissionTree}
    >
      <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6" />
      {driveLoading ? (
        <LoadingBlock className="h-10 flex-grow" />
      ) : (
        <div className="flex flex-col">
          <div className={`leading-none ${!permissionTree ? 'my-auto' : ''}`}>
            <p className="flex flex-row gap-1">
              {drive?.name ?? <span className="font-bold">* {driveGrant.driveMeta?.name}</span>}

              {!isNew ? (
                <>
                  {':'}
                  {totalExistingPermissions && totalExistingPermissions !== totalNewPermission ? (
                    <>
                      <span className="line-through">
                        {t(getDrivePermissionFromNumber([totalExistingPermissions]))}
                      </span>
                      <Arrow className="h-4 w-4" />
                    </>
                  ) : null}
                  <span
                    className={
                      totalExistingPermissions && totalExistingPermissions !== totalNewPermission
                        ? 'font-bold'
                        : ''
                    }
                  >
                    {`${t(getDrivePermissionFromNumber(driveGrant.permissionedDrive.permission))}`}
                  </span>
                </>
              ) : null}
            </p>

            {driveGrant.driveMeta?.attributes ? (
              <div className="pt-2">
                <span className="text-slate-400">
                  {t('Attributes')}:{' '}
                  {Object.keys(driveGrant.driveMeta.attributes).map((attrKey) => (
                    <span key={attrKey} className="mr-1 italic">
                      {attrKey}: {(driveGrant.driveMeta?.attributes || {})[attrKey]}
                    </span>
                  ))}
                </span>
              </div>
            ) : null}
          </div>
          {permissionTree && <small className="ml-1">{permissionTree}</small>}
        </div>
      )}
    </div>
  );
};

export default DrivePermissionRequestView;
