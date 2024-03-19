import { MouseEventHandler, ReactNode, useRef, useState } from 'react';
import { useDotYouClient, useExternalOdinId, useIntersection, useIsConnected } from '../..';

export const IdentityTeaser = ({
  odinId,
  onClick,
  className,
  size,
  isBorderLess,
  children,
}: {
  odinId: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  className?: string;
  size?: 'md' | 'sm';
  isBorderLess?: boolean;
  children?: ReactNode;
}) => {
  const { getIdentity, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const identity = getIdentity();
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLAnchorElement>(null);

  // Todo: check if we need to fetch Contact details as well, so we can use local overrides
  const { data: connectionDetails } = useExternalOdinId({
    odinId: isInView ? odinId : undefined,
  }).fetch;

  // isLocal when both the logged in user and the api host is the same
  const isLocal = identity === dotYouClient.getIdentity();
  const { data: isConnected } = useIsConnected(isInView && isLocal ? odinId : undefined);
  useIntersection(wrapperRef, () => setIsInView(true));

  const imageSizeClass = size === 'sm' ? 'h-10 w-10 mr-2' : 'h-16 w-16 mr-4';
  const link = `https://${odinId}${isConnected && identity ? '?youauth-logon=' + identity : ''}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`flex h-full w-full items-center rounded-lg ${
        isBorderLess ? '-mx-1 p-1' : 'border border-gray-200 p-4 dark:border-gray-700'
      } bg-background hover:shadow-md relative hover:z-10 hover:dark:shadow-slate-600 ${
        className ?? ''
      }`}
      ref={wrapperRef}
    >
      <div className="flex h-full w-full items-center">
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
            className={`title-font font-medium ${size === 'sm' ? 'text-sm' : ''}  text-opacity-60`}
          >
            {connectionDetails?.name ?? odinId}
          </h2>
          <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-foreground text-opacity-40`}>
            {odinId}
          </p>
        </div>
        {children}
      </div>
    </a>
  );
};
