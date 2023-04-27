import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import usePortal from '../../../hooks/portal/usePortal';

import Question from '../../ui/Icons/Question/Question';
import DialogWrapper from '../../ui/Dialog/DialogWrapper';

const InfoDialog = ({
  title,
  children,

  isOpen,

  onCancel,
}: {
  title: string;
  children: ReactNode;

  isOpen: boolean;

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
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default InfoDialog;
