import { ReactNode } from 'react';

const IconFrame = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div
      className={`mr-2 flex justify-center bg-slate-200 p-2 align-middle dark:bg-slate-800 ${
        className ?? ''
      }`}
    >
      {children}
    </div>
  );
};

export default IconFrame;
