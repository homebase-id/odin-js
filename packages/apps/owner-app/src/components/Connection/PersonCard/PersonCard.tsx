import { ReactNode } from 'react';

import { CheckboxFancy, HybridLink, ContactImage } from '@homebase-id/common-app';

export interface PersonCardProps {
  odinId: string;
  href?: string;
  isChecked?: boolean;
  className?: string;
  children?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  canSave: boolean;
}

const PersonCard = ({
  odinId,
  href,
  isChecked,
  className,
  children,
  onClick,
  canSave,
}: PersonCardProps) => {
  return (
    <HybridLink className={`group relative ${className || ''}`} href={href}>
      <div
        className={`h-full overflow-hidden rounded-md border bg-background transition-colors ${
          isChecked
            ? 'border-2 border-indigo-500 dark:border-indigo-500'
            : isChecked === false
              ? 'border-2'
              : 'border-gray-200 border-opacity-60 dark:border-gray-900'
        } ${href ? 'cursor-pointer hover:shadow-md hover:dark:shadow-slate-600' : ''}`}
        onClick={onClick}
      >
        <ContactImage odinId={odinId} canSave={canSave} />
        <div className="p-2">{children}</div>
        {isChecked === undefined ? null : (
          <CheckboxFancy checked={isChecked} readOnly className="absolute right-3 top-3" />
        )}
      </div>
    </HybridLink>
  );
};

export default PersonCard;
