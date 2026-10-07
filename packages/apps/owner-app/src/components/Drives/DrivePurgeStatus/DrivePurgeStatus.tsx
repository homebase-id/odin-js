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
  retryStatus: 'idle' | 'pending' | 'success' | 'error';
}) => {
  const name = purge.name || t('a drive');
  const doing = purge.kind === 'delete' ? t('Deleting') : t('Emptying');
  const left = `${purge.filesRemaining} ${purge.filesRemaining === 1 ? t('file left') : t('files left')}`;

  if (purge.stopped || purge.lastError) {
    return (
      <Alert type={purge.stopped ? 'critical' : 'warning'} title={`${doing} ${name}: ${left}`} isCompact={true}>
        <div className="flex flex-row items-center gap-3">
          <p className="flex-grow">
            {purge.stopped ? t('This stopped and is not retrying.') : t('A run failed; it will retry.')}
            {purge.lastError ? ` ${t('Last error')}: ${purge.lastError}` : ''}
          </p>
          {purge.stopped ? (
            <ActionButton type="secondary" onClick={onRetry} state={retryStatus}>
              {t('Retry')}
            </ActionButton>
          ) : null}
        </div>
      </Alert>
    );
  }

  return (
    <Alert type="info" title={`${doing} ${name}…`} isCompact={true}>
      {left}. {t('This runs in the background; you can leave this page.')}
    </Alert>
  );
};
