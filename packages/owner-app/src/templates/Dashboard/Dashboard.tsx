import { Link } from 'react-router-dom';
import PersonIncomingRequest from '../../components/Connection/PersonIncomingRequest/PersonIncomingRequest';
import { useApps } from '../../hooks/apps/useApps';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  usePendingConnections,
  useCircles,
  t,
  CirclePermissionView,
  EmbeddedPostContent,
  FakeAnchor,
  Arrow,
  House,
} from '@youfoundation/common-app';
import { useSocialFeed } from '@youfoundation/common-app';

const About = {
  circles: (
    <p>
      Circles are groups of members that share the same permissions. You can name them based on
      which social circle your connections belong (eg: family, friends, co-workers, ...). Or
      anything else that works for you
    </p>
  ),
  apps: (
    <p>
      Apps are applications that have been granted access to one or more of your drives. They are
      able to access that information on your behalf so do make sure when registering new apps on
      your identity that they don&apos;t request any drive access that you don&apos;t feel
      comfortable with.
    </p>
  ),
};

const Dashboard = () => {
  return (
    <>
      <PageMeta title={t('Dashboard')} icon={House} />

      <p className="max-w-md text-slate-400">
        Welcome to your owner console. Edit your{' '}
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

      <div className="mt-9 grid gap-10 lg:grid-cols-2 2xl:grid-cols-3">
        <FeedTeaser className="" />

        <div className="flex w-full flex-col gap-10 2xl:col-span-2 2xl:flex-row">
          <div className="flex flex-col gap-10">
            <HomebaseAppTeaser className="w-full" />
            <CircleTeaser className="w-full" />
          </div>
          <ConnectionTeaser className="w-full" />
        </div>
      </div>
    </>
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
      <FakeAnchor href={hasPosts ? `/owner/feed` : `/owner/connections`} className="">
        <div className="pointer-events-none flex flex-col gap-4">
          {hasPosts ? (
            latestPosts.slice(0, POSTS_TO_SHOW).map((post, index) => (
              <div
                className={`rounded-md bg-background ${index !== 0 ? 'hidden lg:block' : ''}`}
                key={post.fileId}
              >
                <EmbeddedPostContent
                  content={{
                    ...post.content,
                    userDate: post.userDate,
                    permalink: '',
                    previewThumbnail: post.previewThumbnail,
                  }}
                />
              </div>
            ))
          ) : (
            <p className="rounded-md bg-background px-4 py-4 text-slate-400">
              {t(
                'Fill up your feed, by following people, or making connections with other identtiies'
              )}
            </p>
          )}
        </div>
      </FakeAnchor>
    </div>
  );
};

const ConnectionTeaser = ({ className }: { className?: string }) => {
  const { data: pendingConnections, isLoading: pendingConnectionsLoading } = usePendingConnections({
    pageSize: 5,
    pageNumber: 1,
  }).fetch;

  if (pendingConnectionsLoading || !pendingConnections?.results?.length) return null;

  return (
    <div className={className}>
      <p className="text-2xl">{t('Connection requests')}</p>
      <div className="flex flex-row flex-wrap gap-1">
        {pendingConnections?.results?.map((pendingConnection) => (
          <PersonIncomingRequest
            className="w-1/2 max-w-[18rem]"
            senderOdinId={pendingConnection.senderOdinId}
            key={pendingConnection.senderOdinId}
          />
        ))}
      </div>
    </div>
  );
};

const CircleTeaser = ({ className }: { className?: string }) => {
  const {
    fetch: { data: circles, isLoading: isCirclesLoading },
  } = useCircles();

  return (
    <div className={className}>
      <p className="mb-4 text-2xl">{t('Circles & Services')}</p>
      {!circles?.length && !isCirclesLoading ? (
        <p className="rounded-md bg-background px-4 py-4 text-slate-400">{About['circles']}</p>
      ) : (
        <div className="flex flex-row flex-wrap gap-2">
          {circles?.map((circle) => {
            return (
              <CirclePermissionView
                circleDef={circle}
                key={circle.id}
                hideMembers={true}
                className="rounded-md bg-background px-5 py-4 text-lg transition-colors hover:bg-primary/10"
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const HomebaseAppTeaser = ({ className }: { className?: string }) => {
  const { data: apps, isLoading: isAppsLoading } = useApps().fetchRegistered;
  const webApps = apps?.filter((app) => !!app.corsHostName && !app.isRevoked);

  return (
    <div className={className}>
      <p className="mb-4 text-2xl">{t('Apps & Services')}</p>
      {!webApps?.length && !isAppsLoading ? (
        <p className="rounded-md bg-background px-4 py-4 text-slate-400">{About['apps']}</p>
      ) : (
        <div className="flex flex-row flex-wrap gap-2">
          {webApps?.map((app) => {
            return (
              <a
                href={`https://${app.corsHostName}`}
                className="flex flex-grow items-center justify-between gap-2 rounded-md bg-background px-5 py-4 text-lg transition-colors hover:bg-primary/10"
                key={app.appId}
              >
                {app.name}
                <Arrow className="h-5 w-5" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
