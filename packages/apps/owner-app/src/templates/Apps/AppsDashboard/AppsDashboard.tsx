import {
  t,
  getOwnerAppPath,
  LoadingBlock,
  OWNER_APP_ID,
  PageMeta,
  useCircles,
} from '@homebase-id/common-app';
import {
  Grid,
  HardDrive,
  Circles as CirclesIcon,
  Persons,
  Arrow,
} from '@homebase-id/common-app/icons';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import { CircleDefinition } from '@homebase-id/js-lib/network';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { DrivePurgeStatus } from '../../../components/Drives/DrivePurgeStatus/DrivePurgeStatus';
import { useApps } from '../../../hooks/apps/useApps';
import { useDrives } from '../../../hooks/drives/useDrives';
import { isOwnerConsoleApp } from '../../../hooks/apps/useOwnerAppName';
import { RedactedAppRegistration } from '../../../provider/app/AppManagementProviderTypes';

/**
 * Apps as the main stage.
 *
 * Apps own drives and circles now, so the app is the thing you navigate from and the drive or
 * circle is what you find inside it. The owner console sits alongside the apps: it owns drives and
 * circles too, and is where those that predate app ownership and belong to no app are found.
 *
 * Deliberately an index and nothing more: every card leads to the existing app page rather than
 * re-implementing it. What the card has to earn its place with is the count of what the app owns,
 * because that is the question this screen exists to answer and the one no other screen does.
 */
const AppsDashboard = () => {
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;
  const {
    fetch: { data: drives, isLoading: drivesLoading },
  } = useDrives();

  const isLoading = appsLoading || circlesLoading || drivesLoading;

  const ownedBy = (appId: string) => ({
    drives: (drives ?? []).filter((d) => stringGuidsEqual(d.appId ?? undefined, appId)),
    circles: (circles ?? []).filter((c) => stringGuidsEqual(c.appId ?? undefined, appId)),
  });

  // The owner console's own, and everything predating app ownership that no app owns yet.
  const ownerConsoleDrives = (drives ?? []).filter((d) => isOwnerConsoleApp(d.appId));
  const ownerConsoleCircles = (circles ?? []).filter((c) => isOwnerConsoleApp(c.appId));

  return (
    <>
      <PageMeta icon={Grid} title={t('Apps')} />
      <DrivePurgeStatus className="mb-5" />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <LoadingBlock className="h-32" />
          <LoadingBlock className="h-32" />
          <LoadingBlock className="h-32" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <OwnerConsoleCard drives={ownerConsoleDrives} circles={ownerConsoleCircles} />
          {(apps ?? []).map((app) => (
            <AppCard key={app.appId} app={app} {...ownedBy(app.appId)} />
          ))}
        </div>
      )}
    </>
  );
};

const AppCard = ({
  app,
  drives,
  circles,
}: {
  app: RedactedAppRegistration;
  drives: DriveDefinition[];
  circles: CircleDefinition[];
}) => (
  <CardLink
    title={app.name}
    href={`/owner/apps/${encodeURIComponent(app.appId)}`}
    icon={Arrow}
    isDisabled={app.isRevoked}
  >
    {app.isRevoked ? (
      <p className="mb-2 text-sm text-red-600 dark:text-red-400">{t('Revoked')}</p>
    ) : null}

    {/* Owning and authorizing are different relations and an app can be in either or both: it
        OWNS what it may administer, and AUTHORIZES the circles whose members its drives are
        granted to. Both are shown, because knowing only one misreads the app's reach. */}
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
      <Tally
        icon={<HardDrive className="h-4 w-4" />}
        count={drives.length}
        label={t('drives owned')}
      />
      <Tally
        icon={<CirclesIcon className="h-4 w-4" />}
        count={circles.length}
        label={t('circles owned')}
      />
      <Tally
        icon={<Persons className="h-4 w-4" />}
        count={app.authorizedCircles?.length ?? 0}
        label={t('circles authorized')}
      />
    </dl>

    {/* The app's half of every drive address it owns. Absent on hosts without the column, and on
        apps that own nothing addressable -- shown only when it is real. */}
    {app.appSlug ? (
      <p className="mt-3 text-sm text-slate-400">
        <span className="break-all font-mono">/apps/{app.appSlug}</span>
      </p>
    ) : null}
  </CardLink>
);

const OwnerConsoleCard = ({
  drives,
  circles,
}: {
  drives: DriveDefinition[];
  circles: CircleDefinition[];
}) => (
  <CardLink title={t('Owner console')} href={getOwnerAppPath(OWNER_APP_ID)} icon={Arrow}>
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
      <Tally icon={<HardDrive className="h-4 w-4" />} count={drives.length} label={t('drives owned')} />
      <Tally
        icon={<CirclesIcon className="h-4 w-4" />}
        count={circles.length}
        label={t('circles owned')}
      />
    </dl>
  </CardLink>
);

/** Zero is greyed rather than hidden: "owns no drives" is an answer, and dropping the row would
    make cards differ in height for a reason the reader cannot see. */
const Tally = ({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) => (
  <>
    <dt className={`flex flex-row items-center gap-2 ${count === 0 ? 'text-slate-400' : ''}`}>
      {icon}
      <span className="tabular-nums">{count}</span>
    </dt>
    <dd className={count === 0 ? 'text-slate-400' : ''}>{label}</dd>
  </>
);

export default AppsDashboard;
