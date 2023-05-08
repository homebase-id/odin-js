import { t } from '@youfoundation/common-app';
import useDrive from '../../../hooks/drives/useDrive';
import { DriveGrantRequest } from '../../../provider/app/AppManagementProviderTypes';
import { drivePermissionLevels } from '../../../provider/permission/permissionLevels';
import { HardDrive } from '@youfoundation/common-app';
import { getAccessFromPermissionNumber } from '../../../templates/DemoData/helpers';
import { LoadingParagraph } from '@youfoundation/common-app';

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
        <LoadingParagraph className="h-10 flex-grow" />
      ) : (
        <div className="flex flex-col">
          <p className={`leading-none ${!permissionTree ? 'my-auto' : ''}`}>
            {drive?.name ?? (
              <>
                <span className="font-bold">*</span> {driveGrant.driveMeta?.name}
              </>
            )}
            {!isNew
              ? `: ${
                  getAccessFromPermissionNumber(
                    driveGrant.permissionedDrive.permission,
                    drivePermissionLevels
                  ).name
                }`
              : null}
          </p>
          {permissionTree && <small className="ml-1">{permissionTree}</small>}
        </div>
      )}
    </div>
  );
};

export default DrivePermissionRequestView;
