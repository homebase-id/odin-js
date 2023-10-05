import { Link } from 'react-router-dom';
import PersonIncomingRequest from '../../components/Connection/PersonIncomingRequest/PersonIncomingRequest';
import AppMembershipView from '../../components/PermissionViews/AppPermissionView/AppPermissionView';
import InfoBox from '../../components/ui/InfoBox/InfoBox';
import Section from '../../components/ui/Sections/Section';
import useApps from '../../hooks/apps/useApps';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  usePendingConnections,
  useCircles,
  t,
  Alert,
  CirclePermissionView,
  useFollowingInfinite,
  EmbeddedPostContent,
} from '@youfoundation/common-app';
import useSocialFeed from '@youfoundation/common-app/src/hooks/socialFeed/useSocialFeed';
import ContactImage from '../../components/Connection/ContactImage/ContactImage';

const About = {
  drives: (
    <>
      <p>
        Drives are the center of your identity. They contain your data in their many different
        forms. Drives hold the data of your profile(s), drafted and published blogs.{' '}
      </p>
      <p className="mt-2">
        Data on these drives can be accessed by you, one of your approved connections, one of your
        approved apps and the <span className="line-through">YouFoundation</span>. No scratch that,
        it is your data you are always in control. We will never access your data, because we
        promise not to... And because it is technically impossible.
      </p>
    </>
  ),
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
  const { data: pendingConnections, isLoading: pendingConnectionsLoading } = usePendingConnections({
    pageSize: 5,
    pageNumber: 1,
  }).fetch;
  const {
    fetch: { data: circles, isLoading: isCirclesLoading },
  } = useCircles();
  const { data: apps, isLoading: isAppsLoading } = useApps().fetchRegistered;

  return (
    <>
      <PageMeta title={t('Dashboard')} />

      <p className="max-w-md">
        Welcome to your owner console. Here you will be able to edit your{' '}
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

      {!pendingConnectionsLoading && pendingConnections?.results?.length ? (
        <Section title={t('Connection requests')} className="mb-4">
          <div className="-m-1 flex flex-row flex-wrap">
            {pendingConnections?.results?.map((pendingConnection) => (
              <PersonIncomingRequest
                className="w-full p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6"
                senderOdinId={pendingConnection.senderOdinId}
                key={pendingConnection.senderOdinId}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <div className="gap-4 lg:grid lg:grid-cols-3">
        <FeedTeaser />

        <Section
          className="h-full"
          title={t('Circles')}
          actions={<InfoBox title={t('About Circles')}>{About['circles']}</InfoBox>}
        >
          <ul className="-my-4">
            {!circles?.length && !isCirclesLoading ? (
              <Alert className="my-2" type={'info'} isCompact={true}>
                {About['circles']}
              </Alert>
            ) : (
              circles?.map((circle) => {
                return <CirclePermissionView circleDef={circle} key={circle.id} className="my-4" />;
              })
            )}
          </ul>
        </Section>
        <Section
          className="h-full"
          title={t('Apps')}
          actions={<InfoBox title={t('About Apps')}>{About['apps']}</InfoBox>}
        >
          <ul className="-my-4">
            {!apps?.length && !isAppsLoading ? (
              <Alert className="my-2" type={'info'} isCompact={true}>
                {About['apps']}
              </Alert>
            ) : (
              apps?.map((app) => {
                return <AppMembershipView className="my-4" appDef={app} key={app.appId} />;
              })
            )}
          </ul>
        </Section>
      </div>
    </>
  );
};

const FeedTeaser = () => {
  const { data: following, isFetched: followingFetched } = useFollowingInfinite({
    pageSize: 5,
  }).fetch;

  const followingList = following?.pages
    .flatMap((page) => page?.results)
    .filter(Boolean) as string[];

  const { data: posts } = useSocialFeed({ pageSize: 1 }).fetchAll;
  const latestPost = posts?.pages?.[0]?.results?.[0];

  return (
    <>
      <Section
        title={t('Your Feed')}
        actions={
          followingFetched && followingList ? (
            <div className="pointer-events-none ml-auto mt-auto flex shrink-0 flex-row">
              {followingList.map((odinId) => {
                return (
                  <ContactImage
                    odinId={odinId}
                    className="-mr-2 h-7 w-7 overflow-hidden rounded-full border last:mr-0 dark:border-slate-500"
                    fallbackSize="xs"
                    key={odinId}
                  />
                );
              })}
            </div>
          ) : null
        }
        className="h-full"
      >
        <Link to={`/owner/feed`} className="block h-full">
          <div className="pointer-events-none">
            <p className="mb-5 text-slate-400">{t('See what everyone has been up to')}</p>
            {latestPost ? (
              <EmbeddedPostContent content={{ ...latestPost.content, permalink: '' }} />
            ) : null}
          </div>
        </Link>
      </Section>
    </>
  );
};

export default Dashboard;
