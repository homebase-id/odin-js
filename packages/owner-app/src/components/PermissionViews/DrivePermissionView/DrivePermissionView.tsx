import { DriveDefinition } from '@youfoundation/js-lib/core';
import { Link } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import useDrive from '../../../hooks/drives/useDrive';
import { Arrow } from '@youfoundation/common-app';
import { HardDrive } from '@youfoundation/common-app';
import { LoadingBlock } from '@youfoundation/common-app';
import { DriveGrant } from '@youfoundation/js-lib/network';
import { getDrivePermissionFromNumber } from '@youfoundation/js-lib/helpers';

const DrivePermissionView = ({
  driveGrant,
  permissionTree,
  className,
}: {
  driveGrant: DriveGrant;
  permissionTree?: string;
  className?: string;
}) => {
  const { data: drive, isLoading } = useDrive({
    targetDrive: driveGrant.permissionedDrive.drive,
  }).fetch;

  if (isLoading) {
    return <LoadingBlock className={`h-4 max-w-xs ${className}`} />;
  }

  return (
    <div
      key={`${driveGrant?.permissionedDrive?.drive?.alias}-${driveGrant?.permissionedDrive.drive?.type}`}
      className={`flex flex-row ${className}`}
      title={permissionTree}
    >
      <Link
        to={`/owner/drives/${drive?.targetDriveInfo?.alias}_${drive?.targetDriveInfo?.type}`}
        className="flex flex-row hover:text-slate-700 hover:underline dark:hover:text-slate-400"
      >
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6" />
        <div className="mr-2 flex flex-col">
          <p className={`leading-none ${!permissionTree ? 'my-auto' : ''}`}>
            {drive?.name}:{' '}
            {t(getDrivePermissionFromNumber(driveGrant?.permissionedDrive.permission))}
          </p>
          {permissionTree && (
            <small className="">
              {t('Via')} {permissionTree}
            </small>
          )}
        </div>
        <Arrow className="my-auto ml-auto h-5 w-5" />
      </Link>
    </div>
  );
};

export const DriveView = ({ drive, className }: { drive: DriveDefinition; className?: string }) => {
  return (
    <div
      key={`${drive.targetDriveInfo?.alias}-${drive.targetDriveInfo?.type}`}
      className={`flex flex-row ${className}`}
    >
      <Link
        to={`/owner/drives/${drive?.targetDriveInfo?.alias}_${drive?.targetDriveInfo?.type}`}
        className="flex flex-row hover:text-slate-700 hover:underline dark:hover:text-slate-400"
      >
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6 flex-shrink-0" />
        <div className="mr-2 flex flex-col">
          <p className={`my-auto`}>{drive?.name}</p>
        </div>
        <Arrow className="my-auto ml-auto h-5 w-5" />
      </Link>
    </div>
  );
};

export default DrivePermissionView;
