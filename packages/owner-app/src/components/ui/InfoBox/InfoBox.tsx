import { ReactNode, useState } from 'react';
import { Question } from '@homebase-id/common-app/icons';
import { InfoDialog } from '@homebase-id/common-app';

const InfoBox = ({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <a
        onClick={() => setIsOpen(true)}
        title={title}
        className={`cursor-pointer opacity-20 transition-opacity hover:opacity-100 ${
          className ?? ''
        }`}
      >
        <Question className="h-6 w-6" />
      </a>
      <InfoDialog
        isOpen={isOpen}
        onCancel={() => setIsOpen(false)}
        onConfirm={() => setIsOpen(false)}
        title={title}
        children={children}
      />
    </>
  );
};
export default InfoBox;
