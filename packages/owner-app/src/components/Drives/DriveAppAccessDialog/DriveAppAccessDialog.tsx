import { DriveDefinition } from '@homebase-id/js-lib/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  usePortal,
  ActionButton,
  ActionButtonState,
  t,
  ErrorNotification,
  DialogWrapper,
} from '@homebase-id/common-app';

import { Arrow } from '@homebase-id/common-app/icons';
import DrivePermissionFlagEditor from '../../Form/DrivePermissionFlagEditor';
import { useApp } from '../../../hooks/apps/useApp';
import { useApps } from '../../../hooks/apps/useApps';
import { PermissionUpdateRequest } from '../../../provider/app/AppManagementProviderTypes';
import AppMembershipView from '../../PermissionViews/AppPermissionView/AppPermissionView';

const DriveAppAccessDialog = ({
  title,
  confirmText,

  isOpen,
  driveDefinition,

  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;

  isOpen: boolean;
  driveDefinition: DriveDefinition;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const targetDriveInfo = driveDefinition.targetDriveInfo;

  const [saveState, setSaveState] = useState<ActionButtonState>('idle');

  const { data: apps } = useApps().fetchRegistered;
  const { mutateAsync: updateAppPermission, error: updateAppError } = useApp({}).updatePermissions;

  const [newAppPermission, setNewAppPermission] = useState<PermissionUpdateRequest[]>([]);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <ErrorNotification error={updateAppError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaveState('loading');

            try {
              await Promise.all(
                newAppPermission.map(async (newAppPerm) => await updateAppPermission(newAppPerm))
              );
            } catch (ex) {
              setSaveState('error');
            }
            setSaveState('success');

            onConfirm();
            return false;
          }}
        >
          {apps?.length ? (
            <div className="-my-4">
              {apps.map((app) => {
                const matchingNewPermission = newAppPermission?.find(
                  (newAppPerm) => newAppPerm.appId === app.appId
                );

                const driveGrant = (matchingNewPermission?.drives ?? app.grant.driveGrants)?.find(
                  (driveGrant) =>
                    driveGrant.permissionedDrive.drive.alias === targetDriveInfo.alias &&
                    driveGrant.permissionedDrive.drive.type === targetDriveInfo.type
                );

                const isChecked = !!driveGrant?.permissionedDrive.permission?.length;

                return (
                  <div
                    className={`my-4 flex w-full select-none flex-row rounded-lg border p-4 dark:border-slate-800 ${
                      isChecked && 'bg-slate-50 dark:bg-slate-700'
                    }`}
                    key={app.appId}
                  >
                    <AppMembershipView appDef={app} key={app.appId} />
                    <DrivePermissionFlagEditor
                      className="ml-auto"
                      defaultValue={driveGrant?.permissionedDrive.permission || []}
                      onChange={(newValue) => {
                        setNewAppPermission([
                          ...newAppPermission.filter((appPerm) => appPerm.appId !== app.appId),
                          {
                            appId: app.appId,
                            permissionSet: app.grant.permissionSet,
                            drives: [
                              ...app.grant.driveGrants.filter(
                                (driveGrant) =>
                                  driveGrant.permissionedDrive.drive.alias !==
                                    targetDriveInfo.alias &&
                                  driveGrant.permissionedDrive.drive.type !== targetDriveInfo.type
                              ),
                              {
                                permissionedDrive: {
                                  drive: { ...targetDriveInfo },
                                  permission: newValue,
                                },
                              },
                            ],
                          },
                        ]);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton icon={Arrow} state={saveState}>
              {confirmText || t('Save')}
            </ActionButton>
            <ActionButton type="secondary" onClick={onCancel}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default DriveAppAccessDialog;
