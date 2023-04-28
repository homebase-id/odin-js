import { FC, ReactNode } from 'react';
import HybridLink from './HybridLink';

const CardLink = ({
  className,
  isDisabled,
  href,
  title,
  description,
  children,
  icon,
}: {
  className?: string;
  isDisabled?: boolean;
  href?: string;
  title?: string | ReactNode;
  description?: string;
  children?: ReactNode;
  icon?: FC<IconProps>;
}) => {
  return (
    <HybridLink
      href={href}
      className={`flex h-full flex-col rounded-md border border-gray-200 border-opacity-60 bg-white transition-colors hover:shadow-md dark:border-gray-800 dark:bg-black hover:dark:shadow-slate-600 ${
        className ?? ''
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-row items-center bg-slate-100 p-4 dark:bg-slate-900 dark:text-slate-200">
        <h2 className="text-xl">{title}</h2>
        {icon && icon({ className: 'w-4 h-4 ml-auto' })}
      </div>
      {description || children ? (
        <div className="flex flex-grow flex-col p-4">
          <p>{description}</p>
          {children}
        </div>
      ) : null}
    </HybridLink>
  );
};

export default CardLink;
