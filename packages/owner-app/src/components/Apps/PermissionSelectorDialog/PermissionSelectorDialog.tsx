import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ActionButtonState,
  DialogWrapper,
  t,
  usePortal,
  ErrorNotification,
} from '@youfoundation/common-app';

import PermissionSelector from '../../Form/PermissionSelector';
import { PermissionSet } from '@youfoundation/js-lib/core';
import { Arrow } from '@youfoundation/common-app/icons';

const PermissionSelectorDialog = ({
  title,
  isOpen,

  defaultValue,
  error,
  confirmState,

  onConfirm,
  onCancel,
}: {
  title: string;
  isOpen: boolean;

  defaultValue: PermissionSet;
  error: unknown;
  confirmState?: ActionButtonState;

  onConfirm: (permissionSet: PermissionSet) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const [permissionSet, setPermissionSet] = useState<PermissionSet>(defaultValue);

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

            onConfirm({ ...permissionSet });
          }}
        >
          <PermissionSelector
            type="app"
            permissionSet={permissionSet}
            onChange={setPermissionSet}
          />

          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton icon={Arrow} state={confirmState}>
              {t('Save')}
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

export default PermissionSelectorDialog;
