import { MutationStatus } from '@tanstack/react-query';
import { ActionButton, Alert, t } from '@homebase-id/common-app';
import { DrivePurgeStatus as Purge } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDrivePurges } from '../../../hooks/drives/useDrivePurges';

/**
 * Shows the drives still being emptied or deleted in the background -- so the owner sees it happening and knows
 * when it is done -- and a stopped one with its error and a Retry button. Renders nothing when none match.
 */
export const DrivePurgeStatus = ({
  appId,
  driveAlias,
  className,
}: {
  /** Only purges of drives this app owned. */
  appId?: string;
  /** Only the purge of this drive. */
  driveAlias?: string;
  className?: string;
}) => {
  const {
    fetch: { data: purges },
    retry: { mutate: retry, status: retryStatus },
  } = useDrivePurges();

  const shown = (purges ?? []).filter(
    (purge) =>
      (!appId || stringGuidsEqual(purge.appId, appId)) &&
      (!driveAlias || stringGuidsEqual(purge.targetDrive.alias, driveAlias))
  );
  if (!shown.length) return null;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      {shown.map((purge) => (
        <PurgeAlert
          key={purge.targetDrive.alias}
          purge={purge}
          onRetry={() => retry({ targetDrive: purge.targetDrive })}
          retryStatus={retryStatus}
        />
      ))}
    </div>
  );
};

const PurgeAlert = ({
  purge,
  onRetry,
  retryStatus,
}: {
  purge: Purge;
  onRetry: () => void;
  retryStatus: MutationStatus;
}) => {
  const name = purge.name || t('a drive');
  const doing = purge.kind === 'delete' ? t('Deleting') : t('Emptying');
  // The server counts only up to 10,001; past that the exact number would cost a scan of the whole drive.
  const left =
    purge.filesRemaining > 10_000
      ? `10,000+ ${t('files left')}`
      : `${purge.filesRemaining} ${purge.filesRemaining === 1 ? t('file left') : t('files left')}`;

  // Servers older than `phase` only say stopped and lastError; read those the way they always were.
  const phase =
    purge.phase ??
    (purge.stopped
      ? 'stopped'
      : purge.lastError
        ? 'retrying'
        : purge.filesRemaining > 0
          ? 'removingFiles'
          : 'finishing');

  if (phase === 'stopped' || phase === 'retrying') {
    const retryAt = purge.nextRunAt ? new Date(purge.nextRunAt).toLocaleTimeString() : undefined;
    return (
      <Alert
        type={phase === 'stopped' ? 'critical' : 'warning'}
        title={`${doing} ${name}: ${left}`}
        isCompact={true}
      >
        <div className="flex flex-row items-center gap-3">
          <p className="flex-grow">
            {phase === 'stopped'
              ? t('This stopped and is not retrying.')
              : retryAt
                ? `${t('A run failed; it will retry at')} ${retryAt}.`
                : t('A run failed; it will retry.')}
            {purge.lastError ? ` ${t('Last error')}: ${purge.lastError}` : ''}
            {purge.kind === 'delete'
              ? ` ${t('Until this finishes, the drive cannot be created again.')}`
              : ''}
          </p>
          {phase === 'stopped' ? (
            <ActionButton type="secondary" onClick={onRetry} state={retryStatus}>
              {t('Retry')}
            </ActionButton>
          ) : null}
        </div>
      </Alert>
    );
  }

  if (phase === 'finishing') {
    return (
      <Alert
        type="info"
        title={`${t('Finishing up')}: ${doing.toLowerCase()} ${name}…`}
        isCompact={true}
      >
        {purge.kind === 'delete'
          ? t(
              'All files are removed; the last cleanup is still running. Until it finishes, the drive cannot be created again (for example, by reinstalling the app).'
            )
          : t('All files are removed; finishing up.')}{' '}
        {t('You can leave this page.')}
      </Alert>
    );
  }

  return (
    <Alert type="info" title={`${doing} ${name}…`} isCompact={true}>
      {left}. {t('This runs in the background; you can leave this page.')}
    </Alert>
  );
};
