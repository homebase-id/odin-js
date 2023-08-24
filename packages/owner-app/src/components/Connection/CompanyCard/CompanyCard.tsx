import { ReactNode } from 'react';
import { Shop } from '@youfoundation/common-app';

export interface CompanyCardProps {
  domain: string;
  href?: string;
  isChecked?: boolean;
  className: string;
  children?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onlyLoadAfterClick?: boolean;
}

const CompanyCard = ({
  domain,
  href,
  isChecked,
  className,
  children,
  onClick,
  onlyLoadAfterClick,
}: CompanyCardProps) => {
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
          {/* <ContactImage odinId={domain} onlyLoadAfterClick={onlyLoadAfterClick} /> */}
          {/* <Companyimage/> */}
          <div className="absolute left-0 top-0 h-0 w-0 border-b-[7rem] border-l-[7rem] border-b-transparent border-l-indigo-200" />
          <Shop className="absolute left-4 top-4 h-8 w-8" />
        </div>
        <div className="p-2">{children}</div>
      </div>
    </a>
  );
};

export default CompanyCard;
