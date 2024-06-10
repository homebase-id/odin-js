import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t, usePortal, DialogWrapper, ActionButton } from '@youfoundation/common-app';

export const BlockerDialog = ({
  title,
  children,

  isOpen,

  onProceed,
  onCancel,
}: {
  title: ReactNode;
  children?: ReactNode;

  isOpen: boolean;

  onProceed: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} isSidePanel={false}>
      {children || null}
      <div className="flex flex-row-reverse gap-2 pt-8">
        <ActionButton onClick={onProceed} type="secondary">
          {t('Yes, discard changes')}
        </ActionButton>
        <ActionButton onClick={onCancel} type="primary">
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
