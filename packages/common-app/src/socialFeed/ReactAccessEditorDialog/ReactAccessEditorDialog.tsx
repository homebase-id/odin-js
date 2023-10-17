import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { Select } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { ReactAccess } from '@youfoundation/js-lib/public';

export const ReactAccessEditorDialog = ({
  title,

  isOpen,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  title: string;

  isOpen: boolean;
  defaultValue: ReactAccess | undefined;
  onConfirm: (access: ReactAccess | undefined) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [newReactAccess, setNewReactAccess] = useState<ReactAccess | undefined>(defaultValue);

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
          defaultValue={
            newReactAccess !== undefined ? (newReactAccess ? 'true' : 'false') : undefined
          }
          onChange={(e) => setNewReactAccess(e.target.value === 'true')}
        >
          <option>{t('Make a selection')}</option>
          <option value={'true'}>{t('Enabled')}</option>
          <option value={'false'}>{t('Disabled')}</option>
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
