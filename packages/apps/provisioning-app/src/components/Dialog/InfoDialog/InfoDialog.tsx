import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';

import ActionButton from '../../ui/Buttons/ActionButton';
import { DialogWrapper, usePortal } from '@homebase-id/common-app';
import { Question } from '@homebase-id/common-app/icons';

const InfoDialog = ({
  title,
  children,
  confirmText,

  isOpen,

  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmText?: string;

  isOpen: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  if (!isOpen || !target) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Question className="mr-2 h-6 w-6" /> {title}
        </div>
      }
      onClose={onCancel}
      isSidePanel={false}
    >
      {children}
      <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
        <ActionButton onClick={onConfirm}>{confirmText || t('Ok')}</ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default InfoDialog;
