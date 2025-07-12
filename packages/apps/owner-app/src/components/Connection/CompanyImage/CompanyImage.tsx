import {
  FallbackImg,
  HomebaseChat,
  HomebaseFeed,
  HomebasePhoto,
  CHAT_APP_ID,
  FEED_APP_ID,
  OWNER_APP_ID,
  PHOTO_APP_ID,
  HomebaseNotifications,
  MAIL_APP_ID,
  HomebaseMail,
  FEED_CHAT_APP_ID,
  COMMUNITY_APP_ID,
  HomebaseCommunity,
  SOCIAL_SYNC_APP_ID,
  HomebaseSocialSync,
} from '@homebase-id/common-app';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useState, useMemo } from 'react';

export const CompanyImage = ({
  domain,
  appId,
  className,
}: {
  domain: string | undefined;
  appId?: string;
  className?: string;
}) => {
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  const bgClass = 'bg-white dark:bg-black';

  const appIcon = useMemo(() => AppSpecificIcon(appId), [appId]);

  return (
    <div className={`relative z-0 aspect-square ${className || ''}`}>
      {appIcon ? (
        appIcon({ className: 'absolute inset-0 flex aspect-square w-full h-full' })
      ) : (
        <>
          <FallbackImg odinId={domain} className={'absolute inset-0 flex aspect-square w-full'} />
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
  if (stringGuidsEqual(appId, OWNER_APP_ID)) return HomebaseNotifications;
  if (stringGuidsEqual(appId, CHAT_APP_ID)) return HomebaseChat;
  if (stringGuidsEqual(appId, FEED_APP_ID)) return HomebaseFeed;
  if (stringGuidsEqual(appId, FEED_CHAT_APP_ID)) return HomebaseFeed;
  if (stringGuidsEqual(appId, PHOTO_APP_ID)) return HomebasePhoto;
  if (stringGuidsEqual(appId, MAIL_APP_ID)) return HomebaseMail;
  if (stringGuidsEqual(appId, COMMUNITY_APP_ID)) return HomebaseCommunity;
  if (stringGuidsEqual(appId, SOCIAL_SYNC_APP_ID)) return HomebaseSocialSync;
};
