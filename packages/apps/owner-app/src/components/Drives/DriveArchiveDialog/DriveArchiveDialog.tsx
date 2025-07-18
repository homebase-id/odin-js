import {
  usePortal,
  DialogWrapper,
  ActionButton,
  t,
  Label,
  CheckboxToggle,
  ErrorNotification
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import {DriveDefinition, TargetDrive} from '@homebase-id/js-lib/core';
import { createPortal } from 'react-dom';
import { useDrive } from '../../../hooks/drives/useDrive';
import {useEffect, useState} from "react";

export const DriveArchiveDialog = ({
  targetDrive,
  isOpen,
  onClose,
  driveDefinition
}: {
  targetDrive: TargetDrive;
  isOpen: boolean;
  onClose: () => void;
  driveDefinition: DriveDefinition;
}) => {
  const target = usePortal('modal-container');
  const {
    editDriveArchiveFlag:
    {
      mutate: updateDriveArchiveFlag,
      error: updateArchiveFlagError,
      status: updateArchiveFlagStatus,
      reset: resetArchiveFlag,
    }
  } = useDrive({
    targetDrive: targetDrive
  });

  const [isArchived, setIsArchived] = useState(driveDefinition.isArchived);

  useEffect(() => {
    if (updateArchiveFlagStatus=== 'success') {
      resetArchiveFlag();
      onClose();
    }
  }, [updateArchiveFlagStatus]);
  
  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper title={t('Archive Drive')} onClose={onClose}>
      <>
        <ErrorNotification error={updateArchiveFlagError}/>
        <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();

              updateDriveArchiveFlag({
                targetDrive: driveDefinition.targetDriveInfo,
                newArchiveFlag: isArchived
              });

              return false;
            }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-center justify-between gap-2">
              <Label>
                {t('Archive this Drive?')}
                <small className="block text-sm text-slate-400">
                  {t(
                      'Archiving the drive will prevent Apps and guests from reading or writing to it. It will also no longer be visible to them.'
                  )}
                </small>
              </Label>

              <div>
                <CheckboxToggle
                    defaultChecked={isArchived}
                    onChange={(e) => setIsArchived(e.currentTarget.checked)}
                />
              </div>
            </div>

          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton
                icon={Arrow}
                state={updateArchiveFlagStatus}>
              {t('Save')}
            </ActionButton>
            <ActionButton
                type="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  onClose()
                }}>
              {t('Cancel')}
            </ActionButton>
          </div>
          </div>
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
