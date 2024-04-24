import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DialogWrapper } from '../../ui/Dialog/DialogWrapper';
import { usePortal } from '../../hooks/portal/usePortal';
import { Question } from '../../ui/Icons/Question';
import { ActionButton } from '../../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';

export const InfoDialog = ({
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

  if (!isOpen) {
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
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" onClick={onConfirm}>
          {confirmText || t('Ok')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
