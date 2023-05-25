import { ReactNode } from 'react';

import ContactImage from '../ContactImage/ContactImage';

export interface PersonCardProps {
  odinId: string;
  href?: string;
  isChecked?: boolean;
  className: string;
  children?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onlyLoadAfterClick?: boolean;
}

const PersonCard = ({
  odinId,
  href,
  isChecked,
  className,
  children,
  onClick,
  onlyLoadAfterClick,
}: PersonCardProps) => {
  return (
    <a className={`${className}`} href={href}>
      <div
        className={`h-full rounded-md border bg-white transition-colors  ${
          isChecked
            ? 'border-4 border-indigo-500 dark:border-indigo-700'
            : isChecked === false
            ? 'border-4'
            : 'border-gray-200 border-opacity-60 dark:border-gray-800 dark:bg-gray-800'
        }
        ${href ? 'cursor-pointer hover:shadow-md hover:dark:shadow-slate-600' : ''}`}
        onClick={onClick}
      >
        <ContactImage odinId={odinId} onlyLoadAfterClick={onlyLoadAfterClick} />
        <div className="p-2">{children}</div>
      </div>
    </a>
  );
};

export default PersonCard;
