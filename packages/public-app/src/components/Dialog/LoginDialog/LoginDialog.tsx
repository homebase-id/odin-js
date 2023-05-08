import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePortal } from '@youfoundation/common-app';
import { LoginBox } from '../../Auth/ProfileNav/ProfileNav';
import { DialogWrapper } from '@youfoundation/common-app';

const LoginDialog = ({
  title,
  children,

  returnPath,
  isOpen,
  onCancel,
}: {
  title: string;
  children: ReactNode;

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
      <hr className="my-4" />
      <LoginBox
        returnUrl={returnPath ? `https://${window.location.hostname}${returnPath}` : undefined}
      />
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default LoginDialog;
