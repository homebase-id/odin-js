import { Link } from 'react-router-dom';
import { PageMeta } from '@homebase-id/common-app';
import { CompanyImage } from '../../components/Connection/CompanyImage/CompanyImage';
import { getOperatingSystem } from '@homebase-id/js-lib/auth';
import { isTouchDevice } from '@homebase-id/js-lib/helpers';
import { FeedTeaser } from './FeedTeaser';
import { useAutofixDefaultConfig } from '../../hooks/useAutoFixDefaultConfig';
import {
  t,
  ActionGroupOptionProps,
  HybridLink,
  ActionGroup,
  useUnreadPushNotificationsCount,
  OWNER_APP_ID,
  CHAT_APP_ID,
  MAIL_APP_ID,
  FEED_APP_ID,
  PHOTO_APP_ID,
  COMMUNITY_APP_ID,
  SOCIAL_SYNC_APP_ID,
} from '@homebase-id/common-app';
import { House, Cog, Download } from '@homebase-id/common-app/icons';

const Dashboard = () => {
  useAutofixDefaultConfig();

  return (
    <>
      <PageMeta title={t('Dashboard')} icon={House} />

      <p className="max-w-md text-slate-400">
        Your owner console. Edit your{' '}
        <Link className="underline" to="/owner/profile">
          profile
        </Link>
        , manage your{' '}
        <Link className="underline" to="/owner/connections">
          connections
        </Link>
        , manage permissions within{' '}
        <Link className="underline" to="/owner/circles">
          circles
        </Link>{' '}
        and{' '}
        <Link className="underline" to="/owner/third-parties">
          third-parties
        </Link>
        .
      </p>

      <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <SystemApp />
        <FeedApp />
        <ChatApp />
        <MailApp />
        <CommunityApp />
        <PhotoApp />
        <SocialSyncApp />
      </div>

      <div className="mt-10 flex w-full max-w-2xl flex-row flex-wrap gap-4">
        <FeedTeaser className="w-full" />
      </div>
    </>
  );
};

const AppWrapper = ({
  unreadCount,
  href,
  name,
  appId,
  options,
}: {
  unreadCount: number;
  href: string | undefined;
  name: string | undefined;
  appId?: string;
  options?: ActionGroupOptionProps[];
}) => (
  <div className="group relative flex h-full flex-grow flex-col rounded-lg bg-background transition-shadow hover:shadow-lg">
    <HybridLink href={href} className="mx-auto w-full px-2 pt-5">
      <div className="relative flex flex-col items-center">
        <CompanyImage domain={undefined} appId={appId} className="mb-auto w-20" />

        <p className="mx-auto mt-1 text-foreground/40">{name?.replace('Homebase - ', '')}</p>

        {unreadCount > 0 ? (
          <div className="absolute -right-3 -top-3 my-auto flex h-10 w-10 rounded-full bg-foreground">
            <p className="m-auto text-lg leading-none text-background">{unreadCount}</p>
          </div>
        ) : null}
      </div>
    </HybridLink>

    {options ? (
      <div
        className={`flex flex-row justify-center rounded-b-lg bg-slate-100 ${
          isTouchDevice() ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'
        } dark:bg-slate-800`}
      >
        <ActionGroup
          type="mute"
          size="none"
          className="pointer-events-none w-full py-1 group-hover:pointer-events-auto"
          buttonClassName="w-full justify-center"
          options={options}
        />
      </div>
    ) : null}
  </div>
);

const SystemApp = () => {
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: OWNER_APP_ID });

  // const os = getOperatingSystem();
  // const isAndroid = os.name === 'Android';

  return (
    <AppWrapper
      name={'Notifications'}
      appId={OWNER_APP_ID}
      href={'/owner/notifications'}
      unreadCount={unreadCount || 0}
    />
  );
};

const ChatApp = () => {
  // const { data: appReg } = useApp({ appId: CHAT_APP_ID }).fetch;
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: CHAT_APP_ID });
  const os = getOperatingSystem();
  const isAndroid = os.name === 'Android';
  const isIos = os.name === 'iOS';

  return (
    <AppWrapper
      appId={CHAT_APP_ID}
      name={'Chat'}
      href={`/apps/chat`}
      unreadCount={unreadCount || 0}
      options={[
        {
          label: t('Settings'),
          icon: Cog,
          href: `/owner/third-parties/apps/${CHAT_APP_ID}`,
        },
        ...(isAndroid
          ? [
              {
                label: t('Install on Android'),
                icon: Download,
                href: `https://play.google.com/store/apps/details?id=id.homebase.feed`,
              },
            ]
          : isIos
            ? [
                {
                  label: t('Install on iOS'),
                  icon: Download,
                  href: `https://apps.apple.com/us/app/homebase-secure-feed/id6468971238`,
                },
              ]
            : []),
      ]}
    />
  );
};

const MailApp = () => {
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: MAIL_APP_ID });

  return (
    <AppWrapper
      appId={MAIL_APP_ID}
      name={'Mail'}
      href={`/apps/mail`}
      unreadCount={unreadCount || 0}
      options={[
        {
          label: t('Settings'),
          icon: Cog,
          href: `/owner/third-parties/apps/${MAIL_APP_ID}`,
        },
      ]}
    />
  );
};

const CommunityApp = () => {
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: COMMUNITY_APP_ID });
  return (
    <AppWrapper
      appId={COMMUNITY_APP_ID}
      name={'Community'}
      href={`/apps/community`}
      unreadCount={unreadCount || 0}
      options={[
        {
          label: t('Settings'),
          icon: Cog,
          href: `/owner/third-parties/apps/${COMMUNITY_APP_ID}`,
        },
      ]}
    />
  );
};

const FeedApp = () => {
  // const { data: appReg } = useApp({ appId: FEED_APP_ID }).fetch;
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: FEED_APP_ID });
  const os = getOperatingSystem();
  const isAndroid = os.name === 'Android';
  const isIos = os.name === 'iOS';

  return (
    <AppWrapper
      appId={FEED_APP_ID}
      name={'Feed'}
      href={`/apps/feed`}
      unreadCount={unreadCount || 0}
      options={[
        {
          label: t('Settings'),
          icon: Cog,
          href: `/owner/third-parties/apps/${FEED_APP_ID}`,
        },
        ...(isAndroid
          ? [
              {
                label: t('Install on Android'),
                icon: Download,
                href: `https://play.google.com/store/apps/details?id=id.homebase.feed`,
              },
            ]
          : isIos
            ? [
                {
                  label: t('Install on iOS'),
                  icon: Download,
                  href: `https://apps.apple.com/us/app/homebase-secure-feed/id6468971238`,
                },
              ]
            : []),
      ]}
    />
  );
};

const PhotoApp = () => {
  // const { data: appReg } = useApp({ appId: PHOTO_APP_ID }).fetch;
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: PHOTO_APP_ID });

  const os = getOperatingSystem();
  const isAndroid = os.name === 'Android';

  return (
    <AppWrapper
      appId={PHOTO_APP_ID}
      name={'Photos'}
      href={`https://photos.homebase.id`}
      unreadCount={unreadCount || 0}
      options={[
        {
          label: t('Settings'),
          icon: Cog,
          href: `/owner/third-parties/apps/${PHOTO_APP_ID}`,
        },
        ...(isAndroid
          ? [
              {
                label: t('Install on Android'),
                icon: Download,
                href: `https://play.google.com/store/apps/details?id=id.homebase.photos`,
              },
            ]
          : []),
      ]}
    />
  );
};

const SocialSyncApp = () => {
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: SOCIAL_SYNC_APP_ID });

  return (
    <AppWrapper
      appId={SOCIAL_SYNC_APP_ID}
      name={'Social Sync'}
      href={`https://sync.homebase.id`}
      unreadCount={unreadCount || 0}
      options={[
        {
          label: t('Settings'),
          icon: Cog,
          href: `/owner/third-parties/apps/${SOCIAL_SYNC_APP_ID}`,
        },
      ]}
    />
  );
};

export default Dashboard;
