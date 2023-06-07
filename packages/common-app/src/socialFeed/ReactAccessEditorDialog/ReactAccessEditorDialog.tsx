import { SecurityGroupType } from '@youfoundation/js-lib/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { Select } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';

export const ReactAccessEditorDialog = ({
  title,

  isOpen,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  title: string;

  isOpen: boolean;
  defaultValue: SecurityGroupType.Owner | SecurityGroupType.Connected | undefined;
  onConfirm: (access: SecurityGroupType.Owner | SecurityGroupType.Connected) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [newReactAccess, setNewReactAccess] = useState<
    SecurityGroupType.Connected | SecurityGroupType.Owner
  >(defaultValue || SecurityGroupType.Connected);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} isSidePanel={false}>
      <div>
        <Label>{t('Reactions')}</Label>
        <Select
          id="reactAccess"
          name="reactAccess"
          defaultValue={defaultValue}
          onChange={(e) =>
            setNewReactAccess(
              e.target.value === SecurityGroupType.Owner
                ? SecurityGroupType.Owner
                : SecurityGroupType.Connected
            )
          }
        >
          {/* <option value={SecurityGroupType.Authenticated}>{t('Authenticated')}</option> */}
          <option value={SecurityGroupType.Connected}>{t('Enabled')}</option>
          <option value={SecurityGroupType.Owner}>{t('Disabled')}</option>
        </Select>
      </div>
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" onClick={() => onConfirm(newReactAccess)}>
          {t('Confirm')}
        </ActionButton>
        <ActionButton className="m-2" type="secondary" onClick={() => onCancel()}>
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
