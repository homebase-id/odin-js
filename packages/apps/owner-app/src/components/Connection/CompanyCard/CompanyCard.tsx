import { ReactNode } from 'react';
import { HybridLink } from '@homebase-id/common-app';
import { Shop } from '@homebase-id/common-app/icons';
import { CompanyImage } from '../CompanyImage/CompanyImage';

export interface CompanyCardProps {
  domain: string;
  appId?: string;
  href?: string;
  isChecked?: boolean;
  className: string;
  children?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onlyLoadAfterClick?: boolean;
}

const CompanyCard = ({
  domain,
  appId,
  href,
  isChecked,
  className,
  children,
  onClick,
}: CompanyCardProps) => {
  return (
    <HybridLink className={`${className}`} href={href}>
      <div
        className={`h-full rounded-md border bg-primary-container transition-colors  ${
          isChecked
            ? 'border-4 border-primary'
            : isChecked === false
              ? 'border-4'
              : 'border-opacity-60'
        }
        ${href ? 'cursor-pointer hover:shadow-md' : ''}`}
        onClick={onClick}
      >
        <div className="relative">
          <CompanyImage domain={domain} appId={appId} />
          <div className="absolute left-0 top-0 h-0 w-0 border-b-[7rem] border-l-[7rem] border-b-transparent border-l-primary-container border-opacity-90" />
          <Shop className="absolute left-4 top-4 h-8 w-8" />
        </div>
        <div className="p-2">{children}</div>
      </div>
    </HybridLink>
  );
};

export default CompanyCard;
