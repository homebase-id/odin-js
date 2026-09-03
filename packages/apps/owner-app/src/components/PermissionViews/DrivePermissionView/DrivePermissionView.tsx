import { DriveDefinition } from '@homebase-id/js-lib/core';
import { Link } from 'react-router-dom';
import { t } from '@homebase-id/common-app';
import { useDrive } from '../../../hooks/drives/useDrive';
import { Arrow, HardDrive } from '@homebase-id/common-app/icons';
import { LoadingBlock } from '@homebase-id/common-app';
import { DriveGrant } from '@homebase-id/js-lib/network';
import { getDrivePermissionFromNumber } from '@homebase-id/js-lib/helpers';

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

  // A grant whose drive cannot be resolved is still a live grant. Returning null here hid it
  // entirely -- on the pages where access is edited, an invisible grant is worse than an ugly one --
  // so fall back to the raw alias, the way the overview does.
  if (!drive) {
    return (
      <div className={`flex flex-row ${className}`} title={permissionTree}>
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6 flex-shrink-0 text-slate-400" />
        <p className="my-auto text-slate-400">
          <span className="break-all font-mono">
            {driveGrant?.permissionedDrive?.drive?.alias ?? t('Unknown drive')}
          </span>
          {`: ${t(getDrivePermissionFromNumber(driveGrant?.permissionedDrive.permission))}`}
        </p>
      </div>
    );
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
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6 flex-shrink-0" />
        <div className="mr-2 flex flex-col">
          <p className={`leading-none ${!permissionTree ? 'my-auto' : ''}`}>
            {drive?.name}
            {drive?.driveSlug ? (
              <span className="ml-2 break-all font-mono text-sm text-slate-400">
                {drive.driveSlug}
              </span>
            ) : null}
            {': '}
            {t(getDrivePermissionFromNumber(driveGrant?.permissionedDrive.permission))}
            {/* Only app grants carry the flag; a circle grant has no storage key concept, so
                undefined means "not applicable" rather than "no key" and stays unlabelled. */}
            {driveGrant.hasStorageKey ? (
              <span className="text-slate-400">{`, ${t('has storage key')}`}</span>
            ) : null}
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
