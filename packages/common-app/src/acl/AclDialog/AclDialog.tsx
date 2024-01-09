import { AccessControlList } from '@youfoundation/js-lib/core';
import { createPortal } from 'react-dom';
import { AclWizard, t } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';

import { DialogWrapper } from '@youfoundation/common-app';

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
      <>
        <h2 className="mb-2 text-xl">{t('General access')}</h2>
        <AclWizard acl={acl} onConfirm={onConfirm} onCancel={onCancel} direction="column" />
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
