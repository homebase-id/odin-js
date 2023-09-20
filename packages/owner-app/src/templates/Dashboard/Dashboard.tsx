import { Link, useNavigate } from 'react-router-dom';
import PersonIncomingRequest from '../../components/Connection/PersonIncomingRequest/PersonIncomingRequest';
import AppMembershipView from '../../components/PermissionViews/AppPermissionView/AppPermissionView';
import InfoBox from '../../components/ui/InfoBox/InfoBox';
import Section from '../../components/ui/Sections/Section';
import useApps from '../../hooks/apps/useApps';
import { HomePageConfig, HomePageAttributes, HomePageFields } from '@youfoundation/js-lib/public';
import useAttributeVersions from '../../hooks/profiles/useAttributeVersions';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  usePendingConnections,
  useCircles,
  t,
  ActionButton,
  Cog,
  Alert,
  CirclePermissionView,
  AuthorImage,
  Image,
} from '@youfoundation/common-app';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  GetTargetDriveFromProfileId,
  MinimalProfileFields,
} from '@youfoundation/js-lib/profile';

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

  const navigate = useNavigate();

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
        <Section
          title={t('Your homepage')}
          className="h-full"
          actions={
            <ActionButton
              icon={Cog}
              onClick={() => navigate('/owner/profile/homepage')}
              type="mute"
            />
          }
        >
          <HomePageTeaser />
        </Section>
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

const HomePageTeaser = () => {
  const { data: themeAttr } = useAttributeVersions({
    profileId: HomePageConfig.DefaultDriveId,
    type: HomePageAttributes.Theme,
  }).fetchVersions;

  const { data: nameAttr } = useAttributeVersions({
    profileId: BuiltInProfiles.StandardProfileId,
    type: BuiltInAttributes.Name,
  }).fetchVersions;

  return (
    <a
      href={`https://${window.location.hostname}`}
      className="block h-full hover:shadow-md hover:dark:shadow-slate-600"
    >
      <div className="relative">
        <Image
          targetDrive={GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId)}
          fileId={themeAttr?.[0]?.data[HomePageFields.HeaderImageId]}
          className="absolute left-0 right-0 top-0 h-[5rem] w-full "
          fit="cover"
        />

        <div className="relative z-10 mx-auto max-w-[18rem] pt-[1.5rem]">
          <div className="flex h-full px-5">
            <AuthorImage
              size="custom"
              className="m-auto aspect-square max-h-[7rem] w-full max-w-[7rem] rounded-full border-2 border-neutral-200 object-cover"
            />
          </div>
        </div>
        <p className="pb-4 pt-3 text-center">
          {nameAttr?.[0]?.data?.[MinimalProfileFields.DisplayName]}
          <small className="block text-sm text-slate-400">{t('View your online identity')}</small>
        </p>
      </div>
    </a>
  );
};

export default Dashboard;
