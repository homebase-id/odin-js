import { ReactNode } from 'react';
import HybridLink from './HybridLink';

const CardLink = ({
  className,
  isDisabled,
  href,
  title,
  description,
  children,
}: {
  className?: string;
  isDisabled?: boolean;
  href?: string;
  title?: string | ReactNode;
  description?: string;
  children?: ReactNode;
}) => {
  return (
    <HybridLink
      href={href}
      className={`flex h-full flex-col rounded-md border border-gray-200 border-opacity-60 bg-white transition-colors hover:shadow-md dark:border-gray-800 dark:bg-black hover:dark:shadow-slate-600 ${
        className ?? ''
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      <h2 className="bg-slate-100 p-4 text-xl dark:bg-slate-900 dark:text-slate-200">{title}</h2>
      <div className="flex flex-grow flex-col p-4">
        <p>{description}</p>
        {children}
      </div>
    </HybridLink>
  );
};

export default CardLink;
