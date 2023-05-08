import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import ActionButton, { ActionButtonState } from '../../ui/Buttons/ActionButton';
import { DialogWrapper } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import useDrives from '../../../hooks/drives/useDrives';
import DrivePermissionSelector from '../../Form/DrivePermissionSelector';
import { DriveGrant } from '@youfoundation/js-lib';

const DrivePermissionSelectorDialog = ({
  title,
  isOpen,

  allowOwnerOnlyDrives,
  defaultValue,
  error,
  confirmState,

  onConfirm,
  onCancel,
}: {
  title: string;
  isOpen: boolean;

  allowOwnerOnlyDrives?: boolean;
  defaultValue: DriveGrant[];
  error: unknown;
  confirmState?: ActionButtonState;

  onConfirm: (driveGrants: DriveGrant[]) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: drives } = useDrives().fetch;

  const [driveGrants, setDriveGrants] = useState<DriveGrant[]>(defaultValue);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <ErrorNotification error={error} />
      <>
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            onConfirm([...driveGrants]);
          }}
        >
          <DrivePermissionSelector
            driveGrants={driveGrants}
            drives={drives || []}
            onChange={setDriveGrants}
            allowOwnerOnlyDrives={allowOwnerOnlyDrives}
          />
          <div className="-m-2 flex flex-row-reverse py-3">
            <ActionButton className="m-2" icon={'send'} state={confirmState}>
              {t('Save')}
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

export default DrivePermissionSelectorDialog;
