import { ReactNode, useRef, useState } from 'react';
import { useExternalOdinId, useIntersection } from '../..';

export const IdentityTeaser = ({
  odinId,
  className,
  size,
  isBorderLess,
  children,
}: {
  odinId: string;
  className?: string;
  size?: 'md' | 'sm';
  isBorderLess?: boolean;
  children?: ReactNode;
}) => {
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Todo: check if we need to fetch Contact details as well, so we can use local overrides
  const { data: connectionDetails } = useExternalOdinId({
    odinId: isInView ? odinId : undefined,
  }).fetch;

  useIntersection(wrapperRef, () => {
    setIsInView(true);
  });

  const imageSizeClass = size === 'sm' ? 'h-10 w-10 mr-2' : 'h-16 w-16 mr-4';

  return (
    <div
      className={`flex h-full w-full items-center rounded-lg ${
        isBorderLess ? '-mx-1 p-1' : 'border border-gray-200 p-4 dark:border-gray-700'
      } bg-background hover:shadow-md hover:dark:shadow-slate-600 ${className ?? ''}`}
      ref={wrapperRef}
    >
      <div className="flex h-full w-full items-center">
        <a href={`https://${odinId}`} rel="noreferrer noopener">
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
        </a>

        <div className="flex-grow ">
          <a href={`https://${odinId}`} rel="noreferrer noopener">
            <h2
              className={`title-font font-medium ${
                size === 'sm' ? 'text-sm' : ''
              }  text-opacity-60`}
            >
              {connectionDetails?.name ?? odinId}
            </h2>
            <p
              className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-foreground text-opacity-40`}
            >
              {odinId}
            </p>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
};
