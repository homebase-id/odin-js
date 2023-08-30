import { getTwoLettersFromDomain } from '@youfoundation/js-lib/helpers';
import { useState, useMemo } from 'react';
import FallbackImg from '../../ui/FallbackImg/FallbackImg';

export const CompanyImage = ({
  domain,
  className,
  fallbackSize,
}: {
  domain: string;
  className?: string;
  fallbackSize?: 'xs' | 'md';
}) => {
  const [hasFavicon, setHasFavicon] = useState<boolean>(true);
  const initials = useMemo(() => getTwoLettersFromDomain(domain), [domain]);

  const bgClass = 'bg-white dark:bg-black';

  return (
    <div className={`relative z-0 aspect-square ${className || ''}`}>
      <FallbackImg
        initials={initials}
        size={fallbackSize}
        className={'absolute inset-0 flex aspect-square w-full'}
      />
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
