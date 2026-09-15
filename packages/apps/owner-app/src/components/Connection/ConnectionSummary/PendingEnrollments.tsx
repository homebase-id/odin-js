import { t, useConnectionInfo } from '@homebase-id/common-app';
import { Clock, Exclamation, IconFrame } from '@homebase-id/common-app/icons';
import { AwaitingAppEnrollment, ConnectionInfo } from '@homebase-id/js-lib/network';
import Section from '../../ui/Sections/Section';

/**
 * Circles the owner chose for this connection that nobody has been able to grant yet.
 *
 * These are not deposits. A deposit holds real key material and only waits for the Peer Key to come
 * into scope, so it resolves on its own. These hold nothing: they were recorded by a caller that
 * could not source the circle's drive keys in the first place, and they sit until the app that owns
 * the circle comes back for them. That makes "which app is this waiting on" the only useful thing to
 * say about one, and the reason this section exists.
 */
export const PendingEnrollments = ({ odinId }: { odinId?: string }) => {
  const {
    fetch: { data: connectionInfo },
  } = useConnectionInfo({ odinId: odinId });

  if (connectionInfo?.status !== 'connected') return null;

  const awaiting = (connectionInfo as ConnectionInfo).accessGrant?.awaitingApps;
  if (!awaiting?.length) return null;

  return (
    <Section
      title={
        <span className="flex flex-col gap-1">
          {t('Pending enrollments')}
          <p className="text-sm font-normal text-slate-400">
            {t(
              'Circles you chose for this contact that are not in effect yet. Each one completes the next time the app that owns it runs.'
            )}
          </p>
        </span>
      }
    >
      <ul className="flex flex-col gap-3">
        {awaiting.map((entry) => (
          <PendingEnrollmentRow key={`${entry.circleId}-${entry.appId ?? 'owner'}`} entry={entry} />
        ))}
      </ul>
    </Section>
  );
};

const PendingEnrollmentRow = ({ entry }: { entry: AwaitingAppEnrollment }) => {
  // An app id with no name behind it is the one state that does not resolve on its own: the app was
  // deleted, so nothing will ever claim this. Called out rather than shown as ordinary waiting.
  const isStranded = !!entry.appId && !entry.appName;

  return (
    <li className="flex flex-row items-center gap-3">
      <IconFrame className={isStranded ? 'text-red-600 dark:text-red-400' : ''}>
        {isStranded ? <Exclamation className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </IconFrame>
      <span className="flex flex-col">
        <span>{entry.circleName ?? t('A circle that has since been deleted')}</span>
        <span className="text-sm text-slate-400">
          <WaitingOn entry={entry} isStranded={isStranded} />
        </span>
      </span>
    </li>
  );
};

const WaitingOn = ({
  entry,
  isStranded,
}: {
  entry: AwaitingAppEnrollment;
  isStranded: boolean;
}) => {
  if (isStranded) {
    return (
      <span className="text-red-600 dark:text-red-400">
        {t('Waiting on an app that no longer exists; this cannot complete')}
      </span>
    );
  }

  // No app id means an owner circle, which no app can complete -- it clears on the owner's next
  // upgrade pass rather than by an app coming back.
  if (!entry.appId) return <>{t('Waiting on you; this is one of your own circles')}</>;

  return (
    <>
      {t('Waiting on')} {entry.appName}
    </>
  );
};
