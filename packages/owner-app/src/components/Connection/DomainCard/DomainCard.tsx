import { ReactNode } from 'react';

import ContactImage from '../ContactImage/ContactImage';
import { Shop } from '@youfoundation/common-app';

export interface DomainCardProps {
  odinId: string;
  href?: string;
  isChecked?: boolean;
  className: string;
  children?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onlyLoadAfterClick?: boolean;
}

const DomainCard = ({
  odinId,
  href,
  isChecked,
  className,
  children,
  onClick,
  onlyLoadAfterClick,
}: DomainCardProps) => {
  return (
    <a className={`${className}`} href={href}>
      <div
        className={`h-full rounded-md border bg-indigo-100 transition-colors  ${
          isChecked
            ? 'border-4 border-indigo-500 dark:border-indigo-700'
            : isChecked === false
            ? 'border-4'
            : 'border-gray-200 border-opacity-60 dark:border-gray-800 dark:bg-gray-800'
        }
        ${href ? 'cursor-pointer hover:shadow-md hover:dark:shadow-slate-600' : ''}`}
        onClick={onClick}
      >
        <div className="relative">
          <ContactImage odinId={odinId} onlyLoadAfterClick={onlyLoadAfterClick} />
          <Shop className="absolute left-2 top-2 h-10 w-10 rounded-full border border-indigo-200 bg-indigo-100 p-2" />
        </div>
        <div className="p-2">{children}</div>
      </div>
    </a>
  );
};

export default DomainCard;
