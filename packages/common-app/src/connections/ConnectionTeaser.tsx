import { useRef, useState } from 'react';
import { useExternalOdinId, useIntersection } from '../..';

export const ConnectionTeaser = ({
  odinId,
  className,
  size,
  isBorderLess,
}: {
  odinId: string;
  className: string;
  size?: 'md' | 'sm';
  isBorderLess?: boolean;
}) => {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLAnchorElement>(null);

  const { data: connectionDetails } = useExternalOdinId({
    odinId: isInView ? odinId : undefined,
  }).fetch;

  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  const imageSizeClass = size === 'sm' ? 'h-10 w-10 mr-2' : 'h-16 w-16 mr-4';

  return (
    <a
      href={`https://${odinId}`}
      rel="noreferrer noopener"
      className={`flex h-full w-full items-center rounded-lg ${
        isBorderLess ? '-mx-1 p-1' : 'border border-gray-200 p-4 dark:border-gray-700'
      } bg-background hover:shadow-md hover:dark:shadow-slate-600 ${className ?? ''}`}
      ref={wrapperRef}
    >
      {connectionDetails?.image ? (
        <img
          src={connectionDetails?.image}
          className={`${imageSizeClass} flex-shrink-0 rounded-full bg-gray-100 object-cover object-center`}
        />
      ) : (
        <div
          className={`${imageSizeClass} flex-shrink-0 rounded-full bg-gray-100 object-cover object-center`}
        ></div>
      )}

      <div className="flex-grow ">
        <h2
          className={`title-font font-medium ${
            size === 'sm' ? 'text-sm' : ''
          } text-foreground text-opacity-60`}
        >
          {connectionDetails?.name ?? odinId}
        </h2>
        <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-foreground text-opacity-40`}>
          {odinId}
        </p>
      </div>
    </a>
  );
};
