import { ReactNode } from 'react';
import {
  ActionButton,
  Alert,
  HybridLink,
  SubtleMessage,
  t,
} from '@homebase-id/common-app';
import { Circles as CirclesIcon, HardDrive, Refresh, Times, Trash } from '@homebase-id/common-app/icons';
import { CircleDesignation, CircleGrantOn } from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  AppRegistrationProblem,
  DriveAccessEntry,
  DriveGrantRequestV2,
  OwnedCircle,
  OwnedDrive,
  OwnedDriveInfo,
  RedactedBundleToken,
  RedactedCircleDefinitionV2,
  TargetDriveV2,
} from '@homebase-id/js-lib/auth';
import { drivePermissionLabel, errorMessageOf, formatDate, targetDriveKey } from './appsV2Helpers';
import {
  DESIGNATION_HINTS,
  DESIGNATION_LABELS,
  GRANT_ON_HINTS,
  GRANT_ON_LABELS,
  PermissionKeyList,
} from '../Apps/AppOverviewParts';
import { useBundleTokens } from '../../hooks/appsV2/useBundleTokens';

/**
 * Building blocks for the V2 app registration and bundle token screens. The V1 parts
 * (AppOverviewParts) are reused where their input types fit.
 */

export const Badge = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'critical' | 'primary';
}) => (
  <span
    className={`inline-block rounded px-2 py-0.5 text-xs ${
      tone === 'critical'
        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
        : tone === 'warning'
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100'
          : tone === 'primary'
            ? 'bg-primary/10 text-primary'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
    }`}
  >
    {children}
  </span>
);

/** Shows a server message inline (a 400's `title`), rather than only a toast. */
export const V2ErrorAlert = ({ error, title }: { error: unknown; title?: string }) => {
  const message = errorMessageOf(error);
  if (!message) return null;
  return (
    <Alert type="critical" title={title ?? t('Something went wrong')} className="my-4">
      <span className="break-words">{message}</span>
    </Alert>
  );
};

export const ProblemsList = ({
  problems,
  title,
}: {
  problems: AppRegistrationProblem[];
  title?: string;
}) => {
  if (!problems.length) return null;
  return (
    <Alert type="critical" title={title ?? t('This app cannot be allowed')} className="my-5">
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {problems.map((problem, index) => (
          <li key={`${problem.code}-${index}`}>
            {problem.message}
            <small className="block text-slate-500 dark:text-slate-300">
              <span className="font-mono">{problem.code}</span>
              {problem.subject ? <span className="font-mono"> · {problem.subject}</span> : null}
            </small>
          </li>
        ))}
      </ul>
    </Alert>
  );
};

/** One drive the app will reach, labelled with the app that owns it. */
export const DriveAccessRow = ({ entry }: { entry: DriveAccessEntry }) => (
  <div className="flex flex-row items-start">
    <HardDrive className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
    <div className="flex flex-col">
      <span>
        {entry.driveName ? (
          entry.driveName
        ) : (
          <span className="break-all font-mono text-sm">{entry.targetDrive.alias}</span>
        )}
        <span className="text-slate-400">{`: ${drivePermissionLabel(entry.permission)}`}</span>
      </span>
      <small className="text-slate-400">
        {entry.owningAppName || entry.owningAppId
          ? `${t('Owned by')} ${entry.owningAppName ?? entry.owningAppId}`
          : t('Your drive (no app owns it)')}
      </small>
    </div>
  </div>
);

export const DriveAccessList = ({
  entries,
  empty,
}: {
  entries: DriveAccessEntry[];
  empty?: string;
}) => {
  if (!entries.length) return <SubtleMessage>{empty ?? t('No drives')}</SubtleMessage>;
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <DriveAccessRow entry={entry} key={targetDriveKey(entry.targetDrive)} />
      ))}
    </div>
  );
};

const DriveFlags = ({ drive }: { drive: OwnedDrive | OwnedDriveInfo }) => {
  const flags: string[] = [];
  if (drive.allowAnonymousReads) flags.push(t('Anonymous reads'));
  if (drive.allowSubscriptions) flags.push(t('Subscriptions'));
  if (drive.allowCdn) flags.push(t('CDN'));
  if (drive.ownerOnly) flags.push(t('Owner only'));
  if ('isArchived' in drive && drive.isArchived) flags.push(t('Archived'));
  if (!flags.length) return <Badge>{t('Private')}</Badge>;
  return (
    <>
      {flags.map((flag) => (
        <Badge key={flag} tone={flag === t('Anonymous reads') ? 'warning' : 'neutral'}>
          {flag}
        </Badge>
      ))}
    </>
  );
};

/** A drive the app owns or will create: name, slug, type slug and flags. */
export const OwnedDriveSummary = ({
  drive,
  appSlug,
}: {
  drive: OwnedDrive | OwnedDriveInfo;
  appSlug?: string | null;
}) => (
  <div className="flex flex-row items-start">
    <HardDrive className="mr-3 mt-1 h-5 w-5 flex-shrink-0 text-slate-400" />
    <div className="flex flex-col gap-1">
      <span>{drive.name}</span>
      <small className="break-all font-mono text-slate-400">
        {appSlug ? `/apps/${appSlug}/drives/` : ''}
        {drive.driveSlug || '?'}
        <span className="ml-2">
          {t('type')}: {drive.driveTypeSlug || '?'}
        </span>
      </small>
      <div className="flex flex-row flex-wrap gap-1">
        <DriveFlags drive={drive} />
      </div>
    </div>
  </div>
);

/** Plain-words version of a circle's drive grants, naming drives from what is known. */
export const CircleGrantedDrives = ({
  grants,
  driveName,
}: {
  grants: DriveGrantRequestV2[];
  driveName: (drive: TargetDriveV2) => string | undefined;
}) => {
  if (!grants.length) return <SubtleMessage>{t('No drives')}</SubtleMessage>;
  return (
    <div className="flex flex-col gap-1">
      {grants.map((grant) => {
        const drive = grant.permissionedDrive.drive;
        const name = driveName(drive);
        return (
          <div className="flex flex-row items-center text-sm" key={targetDriveKey(drive)}>
            <HardDrive className="mr-2 h-4 w-4 flex-shrink-0 text-slate-400" />
            {name ?? <span className="break-all font-mono">{drive.alias}</span>}
            <span className="text-slate-400">{`: ${drivePermissionLabel(grant.permissionedDrive.permission)}`}</span>
          </div>
        );
      })}
    </div>
  );
};

/** A circle the app will create (or already owns), described from the manifest. */
export const OwnedCirclePreview = ({
  circle,
  driveName,
}: {
  circle: OwnedCircle | RedactedCircleDefinitionV2;
  driveName: (drive: TargetDriveV2) => string | undefined;
}) => {
  const grantOn = circle.grantOn ?? CircleGrantOn.None;
  const designation = circle.designation ?? CircleDesignation.Personal;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 border-opacity-80 p-4 dark:border-gray-700">
      <div className="flex flex-row items-center">
        <CirclesIcon className="mr-3 h-5 w-5 flex-shrink-0" />
        <span>
          {circle.emoji ? `${circle.emoji} ` : ''}
          {circle.name}
        </span>
      </div>
      {circle.description ? <small className="text-slate-400">{circle.description}</small> : null}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-400">{t('Kind')}</dt>
        <dd>
          {DESIGNATION_LABELS[designation] ?? designation}
          {DESIGNATION_HINTS[designation] ? (
            <small className="block max-w-prose text-slate-400">{DESIGNATION_HINTS[designation]}</small>
          ) : null}
        </dd>
        <dt className="text-slate-400">{t('Who joins')}</dt>
        <dd>
          {GRANT_ON_LABELS[grantOn] ?? grantOn}
          {GRANT_ON_HINTS[grantOn] ? (
            <small className="block max-w-prose text-slate-400">{GRANT_ON_HINTS[grantOn]}</small>
          ) : null}
        </dd>
        <dt className="text-slate-400">{t('Members get')}</dt>
        <dd className="flex flex-col gap-2">
          <CircleGrantedDrives grants={circle.driveGrants ?? []} driveName={driveName} />
          {circle.permissions?.keys?.length ? <PermissionKeyList keys={circle.permissions.keys} /> : null}
        </dd>
      </dl>
    </div>
  );
};

/**
 * One bundle token with revoke / allow / delete and per-app removal. Copied from ClientView in
 * AppDetails.tsx (not exported there) and extended with the token's member apps.
 */
export const BundleTokenView = ({
  token,
  highlightAppId,
  className,
}: {
  token: RedactedBundleToken;
  highlightAppId?: string;
  className?: string;
}) => {
  const {
    revoke: { mutateAsync: revoke, status: revokeStatus, reset: resetRevoke, error: revokeError },
    allow: { mutateAsync: allow, status: allowStatus, reset: resetAllow, error: allowError },
    remove: { mutateAsync: remove, status: removeStatus, reset: resetRemove, error: removeError },
    removeApp: { mutateAsync: removeApp, status: removeAppStatus, error: removeAppError },
  } = useBundleTokens({});

  const expired = token.expiresAt && token.expiresAt < Date.now();

  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <div className={`flex flex-row items-center ${token.isRevoked ? 'opacity-50 hover:opacity-90' : ''}`}>
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6 flex-shrink-0" />
        <div className="mr-2 flex flex-col">
          <span className="flex flex-row flex-wrap items-center gap-2">
            {token.friendlyName}
            {token.isRevoked ? <Badge tone="critical">{t('Revoked')}</Badge> : null}
            {expired ? <Badge tone="warning">{t('Expired')}</Badge> : null}
          </span>
          <small className="block text-sm text-slate-400">
            {t('Bundle token')} | {t('Created')}: {formatDate(token.created)} | {t('Expires')}:{' '}
            {formatDate(token.expiresAt)}
          </small>
          <small className="block break-all font-mono text-xs text-slate-400">{token.tokenId}</small>
        </div>
        <div className="ml-auto flex flex-row">
          {!token.isRevoked ? (
            <ActionButton
              icon={Times}
              type="secondary"
              size="square"
              className="ml-2"
              title={t('Revoke')}
              onClick={async () => {
                resetAllow();
                resetRemove();
                await revoke({ tokenId: token.tokenId });
              }}
              state={revokeStatus}
              confirmOptions={{
                type: 'warning',
                title: `${t('Revoke')} "${token.friendlyName}"`,
                body: t(
                  'The device using this token loses access to every app in it on its next request. You can allow it again later.'
                ),
                buttonText: t('Revoke'),
              }}
            />
          ) : (
            <>
              <ActionButton
                icon={Refresh}
                type="primary"
                size="square"
                className="ml-2"
                title={t('Allow')}
                onClick={async () => {
                  resetRevoke();
                  resetRemove();
                  await allow({ tokenId: token.tokenId });
                }}
                state={allowStatus}
                confirmOptions={{
                  type: 'info',
                  title: `${t('Allow')} "${token.friendlyName}"`,
                  body: t('The device using this token gets its access back.'),
                  buttonText: t('Allow'),
                }}
              />
              <ActionButton
                icon={Trash}
                type="remove"
                size="square"
                className="ml-2"
                title={t('Delete')}
                onClick={async () => {
                  resetRevoke();
                  resetAllow();
                  await remove({ tokenId: token.tokenId });
                }}
                confirmOptions={{
                  type: 'warning',
                  title: `${t('Delete token')} "${token.friendlyName}"`,
                  body: t(
                    'Are you sure you want to delete this token? If you ever want to undo this, the device will have to sign in again.'
                  ),
                  buttonText: t('Delete'),
                }}
                state={removeStatus}
              />
            </>
          )}
        </div>
      </div>

      <ul className="ml-9 mt-2 flex flex-col gap-1">
        {token.apps.map((app) => (
          <li key={app.appId} className="flex flex-row flex-wrap items-center gap-2 text-sm">
            <HybridLink
              href={`/owner/apps-v2/${encodeURIComponent(app.appId)}`}
              className={`hover:underline ${
                stringGuidsEqual(app.appId, highlightAppId) ? 'font-semibold' : ''
              }`}
            >
              {app.name || app.appId}
            </HybridLink>
            {app.appSlug ? <span className="font-mono text-slate-400">{app.appSlug}</span> : null}
            {app.isPrimary ? <Badge tone="primary">{t('Primary')}</Badge> : null}
            {app.isRevoked ? <Badge tone="critical">{t('App revoked')}</Badge> : null}
            {app.isMissing ? <Badge tone="warning">{t('App removed')}</Badge> : null}
            {!app.isPrimary ? (
              <ActionButton
                icon={Times}
                type="mute"
                size="square"
                title={t('Remove app from token')}
                onClick={() => removeApp({ tokenId: token.tokenId, appId: app.appId })}
                state={removeAppStatus}
                confirmOptions={{
                  type: 'warning',
                  title: `${t('Remove')} "${app.name}" ${t('from')} "${token.friendlyName}"`,
                  body: t(
                    'The token will no longer reach this app. The other apps in the token keep working.'
                  ),
                  buttonText: t('Remove'),
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <div className="ml-9">
        <V2ErrorAlert error={revokeError || allowError || removeError || removeAppError} />
      </div>
    </div>
  );
};

export const BundleTokenList = ({
  tokens,
  highlightAppId,
  empty,
}: {
  tokens: RedactedBundleToken[] | undefined;
  highlightAppId?: string;
  empty?: string;
}) => {
  if (!tokens?.length) return <SubtleMessage>{empty ?? t('No bundle tokens')}</SubtleMessage>;
  return (
    <div className="flex flex-col gap-6">
      {tokens.map((token) => (
        <BundleTokenView token={token} highlightAppId={highlightAppId} key={token.tokenId} />
      ))}
    </div>
  );
};
