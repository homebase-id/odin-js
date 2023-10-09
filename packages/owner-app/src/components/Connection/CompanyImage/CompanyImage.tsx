import { FallbackImg } from '@youfoundation/common-app';
import { getTwoLettersFromDomain } from '@youfoundation/js-lib/helpers';
import { useState, useMemo } from 'react';

export const CompanyImage = ({
  domain,
  className,
  fallbackSize,
}: {
  domain: string;
  className?: string;
  fallbackSize?: 'xs' | 'md';
}) => {
  const [hasFailed, setHasFailed] = useState<boolean>(false);
  const initials = useMemo(() => getTwoLettersFromDomain(domain), [domain]);

  const bgClass = 'bg-white dark:bg-black';

  return (
    <div className={`relative z-0 aspect-square ${className || ''}`}>
      <FallbackImg
        initials={initials}
        size={fallbackSize}
        className={'absolute inset-0 flex aspect-square w-full'}
      />
      {/* On failed we fully hide the picture element, only visually hiding it, stays on top for safari...  */}
      {!hasFailed ? (
        <picture className={`relative z-10`}>
          <source srcSet={`https://${domain}/pub/image`} />
          <img
            src={`https://${domain}/favicon.ico`}
            className={`m-auto h-full w-full object-scale-down object-center ${bgClass}`}
            alt={domain}
            onError={() => setHasFailed(true)}
          />
        </picture>
      ) : null}
    </div>
  );
};
