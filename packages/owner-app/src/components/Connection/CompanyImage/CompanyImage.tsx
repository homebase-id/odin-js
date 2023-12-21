import {
  FallbackImg,
  Homebase,
  HomebaseChat,
  HomebaseFeed,
  HomebasePhoto,
} from '@youfoundation/common-app';
import { getTwoLettersFromDomain, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useState, useMemo } from 'react';
import { CHAT_APP_ID, FEED_APP_ID, OWNER_APP_ID, PHOTO_APP_ID } from '../../../app/Constants';

export const CompanyImage = ({
  domain,
  appId,
  className,
  fallbackSize,
}: {
  domain: string | undefined;
  appId?: string;
  className?: string;
  fallbackSize?: 'xs' | 'md';
}) => {
  const [hasFailed, setHasFailed] = useState<boolean>(false);
  const initials = useMemo(() => getTwoLettersFromDomain(domain || ''), [domain]);

  const bgClass = 'bg-white dark:bg-black';

  const appIcon = useMemo(() => AppSpecificIcon(appId), [appId]);

  return (
    <div className={`relative z-0 aspect-square ${className || ''}`}>
      {appIcon ? (
        appIcon({ className: 'absolute inset-0 flex aspect-square w-full h-full' })
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export const AppSpecificIcon = (appId: string | undefined) => {
  if (!appId) return;
  if (stringGuidsEqual(appId, OWNER_APP_ID)) return Homebase;
  if (stringGuidsEqual(appId, CHAT_APP_ID)) return HomebaseChat;
  if (stringGuidsEqual(appId, FEED_APP_ID)) return HomebaseFeed;
  if (stringGuidsEqual(appId, PHOTO_APP_ID)) return HomebasePhoto;
};
