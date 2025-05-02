import { MouseEventHandler, ReactNode, useRef, useState } from 'react';
import {
  ContactImage,
  ContactName,
  useOdinClientContext,
  useIntersection,
  useIsConnected,
} from '../..';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';

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
  const odinClient = useOdinClientContext();
  const identity = odinClient.getLoggedInIdentity();
  const [isInView, setIsInView] = useState(false);
  const wrapperRef = useRef<HTMLAnchorElement>(null);

  // isLocal when both the logged in user and the api host is the same
  const isLocal = identity === odinClient.getHostIdentity();
  const { data: isConnected } = useIsConnected(isInView && isLocal ? odinId : undefined);
  useIntersection(wrapperRef, () => setIsInView(true));

  const imageSizeClass = size === 'sm' ? 'h-10 w-10 mr-2' : 'h-16 w-16 mr-4';
  const link = `${new OdinClient({ hostIdentity: odinId, api: ApiType.App }).getRoot()}${isConnected && identity ? '?youauth-logon=' + identity : ''}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`group flex h-full w-full items-center rounded-lg ${
        isBorderLess
          ? '-mx-1 p-1'
          : 'border border-gray-200 p-4 dark:border-gray-700 hover:shadow-md hover:z-10 hover:dark:shadow-slate-600'
      } bg-background relative  ${className ?? ''}`}
      ref={wrapperRef}
    >
      <div className="flex h-full w-full items-center">
        <ContactImage
          odinId={isInView ? odinId : undefined}
          canSave={!!isConnected}
          className={`${imageSizeClass} flex-shrink-0 rounded-full overflow-hidden bg-gray-100 object-cover object-center`}
        />

        <div className="flex-grow ">
          <h2
            className={`title-font font-medium ${size === 'sm' ? 'text-sm' : ''} ${isBorderLess ? 'group-hover:underline' : ''} text-opacity-60`}
          >
            {ContactName({ odinId: isInView ? odinId : null, canSave: !!isConnected }) || odinId}
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
