import { t } from '@youfoundation/common-app';
import { useDrive } from '../../../hooks/drives/useDrive';
import { DriveGrantRequest } from '../../../provider/app/AppManagementProviderTypes';
import { HardDrive } from '@youfoundation/common-app/icons';
import { LoadingBlock } from '@youfoundation/common-app';
import { getDrivePermissionFromNumber } from '@youfoundation/js-lib/helpers';

const DrivePermissionRequestView = ({
  driveGrant,
  permissionTree,
  className,
}: {
  driveGrant: DriveGrantRequest;
  permissionTree?: string;
  className?: string;
}) => {
  const { data: drive, isLoading: driveLoading } = useDrive({
    targetDrive: driveGrant.permissionedDrive.drive,
  }).fetch;

  const isNew = !drive?.name;

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
            <p>
              {drive?.name ?? (
                <>
                  <span className="font-bold">*</span> {driveGrant.driveMeta?.name}
                </>
              )}
              {!isNew
                ? `: ${t(getDrivePermissionFromNumber(driveGrant.permissionedDrive.permission))}`
                : null}
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
