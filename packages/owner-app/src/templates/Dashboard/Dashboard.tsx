import { Link } from 'react-router-dom';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  t,
  House,
  ActionGroup,
  Cog,
  HybridLink,
  ActionGroupOptionProps,
  Download,
  EmbeddedPostContent,
  FakeAnchor,
  useSocialFeed,
  useUnreadPushNotificationsCount,
  CHAT_APP_ID,
  FEED_APP_ID,
  OWNER_APP_ID,
  PHOTO_APP_ID,
} from '@youfoundation/common-app';
import { CompanyImage } from '../../components/Connection/CompanyImage/CompanyImage';
import { getOperatingSystem } from '@youfoundation/js-lib/auth';
import { isTouchDevice } from '@youfoundation/js-lib/helpers';

const Dashboard = () => {
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

      <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
        <SystemApp />
        <ChatApp />
        <FeedApp />
        <PhotoApp />
      </div>

      <div className="mt-10 flex max-w-2xl flex-row flex-wrap gap-4">
        <FeedTeaser />
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
    <HybridLink href={href} className="mx-auto px-5 pt-5">
      <div className="relative flex flex-col items-center">
        <CompanyImage domain={undefined} appId={appId} className="mb-auto w-20" fallbackSize="xs" />

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
  const unreadCount = useUnreadPushNotificationsCount({ appId: OWNER_APP_ID });

  // const os = getOperatingSystem();
  // const isAndroid = os.name === 'Android';

  return (
    <AppWrapper
      name={'Notifications'}
      appId={OWNER_APP_ID}
      href={'/owner/notifications'}
      unreadCount={unreadCount}
    />
  );
};

const ChatApp = () => {
  // const { data: appReg } = useApp({ appId: CHAT_APP_ID }).fetch;
  const unreadCount = useUnreadPushNotificationsCount({ appId: CHAT_APP_ID });
  const os = getOperatingSystem();
  const isAndroid = os.name === 'Android';
  // const isIos = os === 'iOS';

  return (
    <AppWrapper
      appId={CHAT_APP_ID}
      name={'Chat'}
      href={`/apps/chat`}
      unreadCount={unreadCount}
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
                href: `https://play.google.com/store/apps/details?id=id.homebase.chattr`,
              },
            ]
          : []),
      ]}
    />
  );
};

const FeedApp = () => {
  // const { data: appReg } = useApp({ appId: FEED_APP_ID }).fetch;
  const unreadCount = useUnreadPushNotificationsCount({ appId: FEED_APP_ID });
  const os = getOperatingSystem();
  const isAndroid = os.name === 'Android';

  return (
    <AppWrapper
      appId={FEED_APP_ID}
      name={'Feed'}
      href={`/apps/feed`}
      unreadCount={unreadCount}
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
          : []),
      ]}
    />
  );
};

const PhotoApp = () => {
  // const { data: appReg } = useApp({ appId: PHOTO_APP_ID }).fetch;
  const unreadCount = useUnreadPushNotificationsCount({ appId: PHOTO_APP_ID });

  const os = getOperatingSystem();
  const isAndroid = os.name === 'Android';

  return (
    <AppWrapper
      appId={PHOTO_APP_ID}
      name={'Photos'}
      href={`https://photos.homebase.id`}
      unreadCount={unreadCount}
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

const POSTS_TO_SHOW = 2;
const FeedTeaser = ({ className }: { className?: string }) => {
  const { data: posts } = useSocialFeed({ pageSize: POSTS_TO_SHOW }).fetchAll;
  const latestPosts = posts?.pages?.[0]?.results;

  const hasPosts = latestPosts && latestPosts?.length;

  return (
    <div className={className}>
      <div className="mb-4 flex flex-row items-center justify-between">
        <p className="text-2xl">{t('What has everyone been up to?')}</p>
      </div>
      <FakeAnchor href={hasPosts ? `/apps/feed` : `/owner/connections`}>
        <div className="pointer-events-none flex flex-col gap-4">
          {hasPosts ? (
            latestPosts.slice(0, POSTS_TO_SHOW).map((post, index) => (
              <div
                className={`rounded-md bg-background ${index !== 0 ? 'hidden lg:block' : ''}`}
                key={post.fileId}
              >
                <EmbeddedPostContent
                  content={{
                    ...post.fileMetadata.appData.content,
                    payloads: post.fileMetadata.payloads,
                    userDate: post.fileMetadata.appData.userDate || post.fileMetadata.created,
                    lastModified: post.fileMetadata.updated,
                    permalink: '',
                    previewThumbnail: post.fileMetadata.appData.previewThumbnail,
                    fileId: post.fileId as string,
                    globalTransitId: post.fileMetadata.globalTransitId,
                  }}
                />
              </div>
            ))
          ) : (
            <p className="rounded-md bg-background px-4 py-4 text-slate-400">
              {t('Fill up your feed, by following people, or connecting with other identtiies')}
            </p>
          )}
        </div>
      </FakeAnchor>
    </div>
  );
};

export default Dashboard;
