import { ReactNode } from 'react';

export const IconFrame = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div
      className={`mr-2 flex justify-center bg-surface-container-high p-2 align-middle ${
        className ?? ''
      }`}
    >
      {children}
    </div>
  );
};
