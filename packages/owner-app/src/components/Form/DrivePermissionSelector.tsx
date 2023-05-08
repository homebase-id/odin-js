import { DriveDefinition, DriveGrant } from '@youfoundation/js-lib';
import { t, Label } from '@youfoundation/common-app';
import { drivePermissionLevels } from '../../provider/permission/permissionLevels';
import { HardDrive } from '@youfoundation/common-app';
import PermissionLevelEditor from './PermissionLevelEditor';

const DrivePermissionSelector = ({
  drives,
  driveGrants,
  allowOwnerOnlyDrives,
  onChange,
}: {
  drives: DriveDefinition[];
  driveGrants: DriveGrant[];
  allowOwnerOnlyDrives?: boolean;
  onChange: (val: DriveGrant[]) => void;
}) => {
  return (
    <>
      {drives?.length ? (
        <div className="-mb-2">
          {drives
            .filter((drive) => allowOwnerOnlyDrives || !drive.ownerOnly)
            .map((drive, index) => {
              const defaultVal =
                driveGrants?.find(
                  (driveGrant) =>
                    driveGrant.permissionedDrive.drive.alias === drive.targetDriveInfo.alias &&
                    driveGrant.permissionedDrive.drive.type === drive.targetDriveInfo.type
                )?.permissionedDrive.permission ?? 0;

              return (
                <div
                  key={index}
                  className={`my-2 flex w-full select-none flex-row rounded-lg border p-4 dark:border-slate-800 ${
                    defaultVal > 0 && 'bg-slate-50 dark:bg-slate-700'
                  }`}
                >
                  <HardDrive className="my-auto mr-3 h-6 w-6" />
                  <Label
                    htmlFor={`${drive.targetDriveInfo.alias}-${drive.targetDriveInfo.type}`}
                    className="mb-auto mr-2 mt-auto"
                  >
                    {drive.name}
                    <small className="block text-sm text-slate-500">
                      {drive.allowAnonymousReads && t('Allows anonymous read access')}
                    </small>
                  </Label>
                  <PermissionLevelEditor
                    className="my-auto ml-auto"
                    permissionLevels={drivePermissionLevels}
                    defaultValue={
                      driveGrants?.find(
                        (driveGrant) =>
                          driveGrant.permissionedDrive.drive.alias ===
                            drive.targetDriveInfo.alias &&
                          driveGrant.permissionedDrive.drive.type === drive.targetDriveInfo.type
                      )?.permissionedDrive.permission ?? 0
                    }
                    onChange={(value) => {
                      if (value > 0) {
                        onChange([
                          ...(driveGrants?.filter(
                            (driveGrant) =>
                              driveGrant.permissionedDrive?.drive.alias !==
                                drive.targetDriveInfo.alias ||
                              driveGrant.permissionedDrive?.drive.type !==
                                drive.targetDriveInfo.type
                          ) || []),
                          {
                            permissionedDrive: {
                              drive: drive.targetDriveInfo,
                              permission: value,
                            },
                          },
                        ]);
                      } else {
                        onChange([
                          ...driveGrants.filter(
                            (driveGrant) =>
                              driveGrant.permissionedDrive.drive.alias !==
                                drive.targetDriveInfo.alias ||
                              driveGrant.permissionedDrive.drive.type !== drive.targetDriveInfo.type
                          ),
                        ]);
                      }
                    }}
                  />
                </div>
              );
            })}
        </div>
      ) : null}
    </>
  );
};

export default DrivePermissionSelector;
