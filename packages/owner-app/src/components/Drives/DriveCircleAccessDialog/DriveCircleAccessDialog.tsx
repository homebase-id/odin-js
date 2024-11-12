import { DriveDefinition } from '@homebase-id/js-lib/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow } from '@homebase-id/common-app/icons';
import { t, ActionButton, ActionButtonState, usePortal } from '@homebase-id/common-app';
import { useCircle } from '@homebase-id/common-app';
import { useCircles } from '@homebase-id/common-app';
import { ErrorNotification } from '@homebase-id/common-app';
import DrivePermissionFlagEditor from '../../Form/DrivePermissionFlagEditor';
import { CirclePermissionView } from '@homebase-id/common-app';
import { DialogWrapper } from '@homebase-id/common-app';
import { CircleDefinition } from '@homebase-id/js-lib/network';

const DriveCircleAccessDialog = ({
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

  const { data: circles } = useCircles().fetch;
  const { mutateAsync: updateCircle, error: updateError } = useCircle().createOrUpdate;

  const [newCircles, setNewCircles] = useState<CircleDefinition[]>([]);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <ErrorNotification error={updateError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaveState('loading');

            try {
              await Promise.all(newCircles.map(async (circle) => await updateCircle(circle)));
            } catch (ex) {
              console.error('Failed to update circles', ex);
              setSaveState('error');
            }
            setSaveState('success');

            onConfirm();
            return false;
          }}
        >
          {circles?.length ? (
            <div className="-my-4">
              {circles.map((circle) => {
                const matchingNewCircle = newCircles?.find(
                  (newCircle) => newCircle.id === circle.id
                );

                const driveGrant = (matchingNewCircle ?? circle).driveGrants?.find(
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
                    key={circle.id}
                  >
                    <CirclePermissionView
                      key={circle.id}
                      circleDef={circle}
                      onClick={() => undefined}
                      isChecked={isChecked}
                    />
                    <DrivePermissionFlagEditor
                      className="ml-auto"
                      defaultValue={driveGrant?.permissionedDrive.permission || []}
                      onChange={(newValue) => {
                        setNewCircles([
                          ...newCircles.filter((circleToUpdate) => circleToUpdate.id !== circle.id),
                          {
                            ...circle,

                            driveGrants: [
                              ...(circle.driveGrants?.filter(
                                (driveGrant) =>
                                  driveGrant.permissionedDrive.drive.alias !==
                                    targetDriveInfo.alias &&
                                  driveGrant.permissionedDrive.drive.type !== targetDriveInfo.type
                              ),
                              []),
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

export default DriveCircleAccessDialog;
