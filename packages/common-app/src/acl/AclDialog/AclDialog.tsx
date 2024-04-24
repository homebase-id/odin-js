import { AccessControlList } from '@youfoundation/js-lib/core';
import { createPortal } from 'react-dom';
import { usePortal } from '../../hooks/portal/usePortal';
import { DialogWrapper } from '../../ui/Dialog/DialogWrapper';
import { AclWizard } from '../AclWizard/AclWizard';

export const AclDialog = ({
  title,
  isOpen,

  acl,

  onConfirm,
  onCancel,
}: {
  title: string;
  isOpen: boolean;

  acl: AccessControlList;

  onConfirm: (acl: AccessControlList) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <AclWizard acl={acl} onConfirm={onConfirm} onCancel={onCancel} direction="column" />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
