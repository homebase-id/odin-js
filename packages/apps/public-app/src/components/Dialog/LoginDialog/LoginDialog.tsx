import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePortal } from '@homebase-id/common-app';
import { DialogWrapper } from '@homebase-id/common-app';
import { LoginBox } from '../../Auth/LoginBox/LoginBox';

const LoginDialog = ({
  title,
  children,

  returnPath,
  isOpen,
  onCancel,
}: {
  title: string;
  children?: ReactNode;

  returnPath?: string;
  isOpen: boolean;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} isSidePanel={false}>
      {children}
      {children ? <hr className="my-4" /> : null}
      <LoginBox
        returnUrl={returnPath ? `https://${window.location.hostname}${returnPath}` : undefined}
      />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default LoginDialog;
