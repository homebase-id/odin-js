import { ReactNode, useMemo, useState } from 'react';
import { Shop } from '@youfoundation/common-app';
import { getTwoLettersFromDomain } from '@youfoundation/js-lib/helpers';

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
          <CompanyImage domain={domain} />
          {/* <Companyimage/> */}
          <div className="absolute left-0 top-0 h-0 w-0 border-b-[7rem] border-l-[7rem] border-b-transparent border-l-indigo-200" />
          <Shop className="absolute left-4 top-4 h-8 w-8" />
        </div>
        <div className="p-2">{children}</div>
      </div>
    </a>
  );
};

const CompanyImage = ({ domain }: { domain: string }) => {
  const [hasFavicon, setHasFavicon] = useState<boolean>(true);
  const initials = useMemo(() => getTwoLettersFromDomain(domain), [domain]);

  const bgClass = 'bg-white dark:bg-black';

  return (
    <div className="relative z-0 aspect-square">
      <div className={`absolute inset-0 flex aspect-square w-full ${bgClass}`}>
        {initials?.length ? (
          <span className="m-auto text-[75px] font-light">{initials.toUpperCase()}</span>
        ) : (
          <Shop className="m-auto h-16 w-16" />
        )}
      </div>
      <picture className={`relative z-10 ${!hasFavicon ? 'opacity-0' : ''}`}>
        <source srcSet={`https://${domain}/pub/image`} />
        <img
          src={`https://${domain}/favicon.ico`}
          className={`m-auto h-full w-full object-scale-down object-center ${bgClass}`}
          alt={domain}
          onError={() => setHasFavicon(false)}
        />
      </picture>
    </div>
  );
};

export default CompanyCard;
