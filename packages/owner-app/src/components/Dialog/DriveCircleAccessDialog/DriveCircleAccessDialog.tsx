import { DriveDefinition } from '@youfoundation/js-lib/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t, ActionButton, ActionButtonState, usePortal, Arrow } from '@youfoundation/common-app';
import { useCircle } from '@youfoundation/common-app';
import { useCircles } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import DrivePermissionFlagEditor from '../../Form/DrivePermissionFlagEditor';
import { CirclePermissionView } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { CircleDefinition } from '@youfoundation/js-lib/network';

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
  const { mutateAsync: updateCircle, error: updateError } = useCircle({}).createOrUpdate;

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
          <div className="-m-2 flex flex-row-reverse py-3">
            <ActionButton className="m-2" icon={Arrow} state={saveState}>
              {confirmText || t('Save')}
            </ActionButton>
            <ActionButton className="m-2" type="secondary" onClick={onCancel}>
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
