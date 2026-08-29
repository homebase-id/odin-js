import {
  t,
  LoadingBlock,
  PageMeta,
  SubtleMessage,
  useCircles,
  HybridLink,
} from '@homebase-id/common-app';
import { Circles as CirclesIcon, Grid, HardDrive, Triangle } from '@homebase-id/common-app/icons';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import {
  AUTO_CONNECTIONS_CIRCLE_ID,
  CircleDefinition,
  CircleDesignation,
  CircleGrantOn,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  DriveGrant,
} from '@homebase-id/js-lib/network';
import {
  drivesEqual,
  getDrivePermissionFromNumber,
  getPermissionKeyName,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';

import { ReactNode, useState } from 'react';
import Section from '../../../components/ui/Sections/Section';
import Submenu from '../../../components/SubMenu/SubMenu';
import { useApps } from '../../../hooks/apps/useApps';
import { useDrives } from '../../../hooks/drives/useDrives';
import { RedactedAppRegistration } from '../../../provider/app/AppManagementProviderTypes';

/**
 * A single read-only page tying the three things together: every registered app, the circles it
 * authorizes, and the drives reachable through either path. Everything here links out to the
 * existing detail pages; nothing on this page edits.
 */
const Overview = () => {
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;
  const { data: drives, isLoading: drivesLoading } = useDrives().fetch;

  const isLoading = appsLoading || circlesLoading || drivesLoading;

  // Owning and authorizing are different relations and a circle can be in either, both or neither:
  // an app OWNS the circles it may create and modify, and AUTHORIZES the circles whose members its
  // drives are granted to. Only a circle in neither is genuinely unattached.
  const unattachedCircles = (circles ?? []).filter((circle) => {
    const owned = (apps ?? []).some((app) => stringGuidsEqual(app.appId, circle.appId));
    const authorized = (apps ?? []).some((app) =>
      (app.authorizedCircles ?? []).some((circleId) => stringGuidsEqual(circleId, circle.id))
    );
    return !owned && !authorized;
  });

  return (
    <>
      <PageMeta icon={Grid} title={t('Third party apps & services')} />

      <Submenu
        items={[
          { title: t('Apps'), path: `/owner/third-parties/apps` },
          { title: t('Services'), path: `/owner/third-parties/services` },
          { title: t('Overview'), path: `/owner/third-parties/overview` },
        ]}
        className="mb-6"
      />

      <p className="mb-6 max-w-2xl text-slate-400">
        {t(
          'Every app you have registered, the circles each app authorizes, and the drives reachable through either. Use it to see at a glance who can reach which drive.'
        )}
      </p>

      {isLoading ? (
        <>
          <LoadingBlock className="m-1 h-32" />
          <LoadingBlock className="m-1 h-32" />
        </>
      ) : (
        <>
          {!apps?.length ? (
            <SubtleMessage>{t('No apps currently registered')}</SubtleMessage>
          ) : (
            apps.map((app) => (
              <AppOverview
                app={app}
                apps={apps}
                circles={circles}
                drives={drives}
                key={app.appId}
              />
            ))
          )}

          {unattachedCircles.length ? (
            <Section title={t('Circles not owned or used by any app')}>
              <div className="flex flex-col gap-5">
                {unattachedCircles.map((circle) => (
                  <CircleOverview circle={circle} apps={apps} drives={drives} key={circle.id} />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </>
  );
};

const AppOverview = ({
  app,
  apps,
  circles,
  drives,
}: {
  app: RedactedAppRegistration;
  apps: RedactedAppRegistration[] | undefined;
  circles: CircleDefinition[] | undefined;
  drives: DriveDefinition[] | undefined;
}) => {
  const directGrants = app.grant?.driveGrants ?? [];
  const circleMemberGrants = app.circleMemberPermissionSetGrantRequest?.drives ?? [];

  const [isOpen, setIsOpen] = useState(true);

  const ownedCircles = (circles ?? []).filter((circle) =>
    stringGuidsEqual(app.appId, circle.appId)
  );

  const authorizedCircles = (app.authorizedCircles ?? [])
    .map((circleId) => (circles ?? []).find((circle) => stringGuidsEqual(circle.id, circleId)))
    .filter((circle): circle is CircleDefinition => !!circle);

  return (
    <Section
      title={
        <span className="flex flex-row flex-wrap items-baseline gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className="-my-1 -ml-1 flex items-center rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={isOpen ? t('Collapse') : t('Expand')}
          >
            <Triangle
              className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
          <HybridLink
            href={`/owner/third-parties/apps/${encodeURIComponent(app.appId)}`}
            className="hover:underline"
          >
            {app.name}
          </HybridLink>
          {app.isRevoked ? (
            <span className="rounded bg-red-100 px-2 py-1 text-sm text-red-700 dark:bg-red-900 dark:text-red-100">
              {t('Revoked')}
            </span>
          ) : null}
          {app.appSlug ? (
            <span className="font-mono text-sm font-normal text-slate-400 break-all">
              {app.appSlug}
            </span>
          ) : null}
          {app.corsHostName ? (
            <span className="text-sm font-normal text-slate-400">{app.corsHostName}</span>
          ) : null}
        </span>
      }
    >
      <div className={`flex flex-col gap-5 ${isOpen ? '' : 'hidden'}`}>
        <div>
          <h3 className="mb-2 font-medium">{t('Drives granted to the app')}</h3>
          <DriveGrantList grants={directGrants} drives={drives} />
        </div>

        <div>
          <h3 className="mb-2 font-medium">{t('Drives granted to members of its circles')}</h3>
          <DriveGrantList grants={circleMemberGrants} drives={drives} />
        </div>

        <div>
          <h3 className="mb-2 font-medium">{t('Circles it owns')}</h3>
          {!ownedCircles.length ? (
            <SubtleMessage>{t('No circles owned by this app')}</SubtleMessage>
          ) : (
            <div className="flex flex-col gap-4">
              {ownedCircles.map((circle) => (
                <CircleOverview circle={circle} apps={apps} drives={drives} key={circle.id} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-medium">{t('Authorized circles')}</h3>
          {!authorizedCircles.length ? (
            <SubtleMessage>{t('No circles authorized on this app')}</SubtleMessage>
          ) : (
            <div className="flex flex-col gap-4">
              {authorizedCircles.map((circle) => (
                <CircleOverview circle={circle} apps={apps} drives={drives} key={circle.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

const formatTimestamp = (value: number | undefined) =>
  value ? new Date(value).toLocaleString() : undefined;

/**
 * Every field on CircleDefinition, so this page is the one place the whole circle is visible.
 * grantOn / designation / emoji / appId are only served by hosts that have them, so each is
 * rendered only when present rather than shown as a default that the host never sent.
 */
const CircleOverview = ({
  circle,
  apps,
  drives,
}: {
  circle: CircleDefinition;
  apps: RedactedAppRegistration[] | undefined;
  drives: DriveDefinition[] | undefined;
}) => {
  const isSystemCircle =
    stringGuidsEqual(circle.id, CONFIRMED_CONNECTIONS_CIRCLE_ID) ||
    stringGuidsEqual(circle.id, AUTO_CONNECTIONS_CIRCLE_ID);

  const owningApp = circle.appId
    ? (apps ?? []).find((app) => stringGuidsEqual(app.appId, circle.appId))
    : undefined;

  const permissionKeys = circle.permissions?.keys ?? [];
  const created = formatTimestamp(circle.created);
  const lastUpdated = formatTimestamp(circle.lastUpdated);

  return (
    <div className={`flex flex-col ${circle.disabled ? 'opacity-50' : ''}`}>
      <HybridLink
        href={`/owner/circles/${encodeURIComponent(circle.id ?? '')}`}
        className="flex flex-row items-center hover:underline"
      >
        <CirclesIcon className="mr-3 h-6 w-6 flex-shrink-0" />
        <span className="flex flex-row flex-wrap items-baseline gap-2">
          <span>
            {circle.emoji ? `${circle.emoji} ` : ''}
            {circle.disabled ? `${t('Disabled')}: ` : ''}
            {circle.name}
          </span>
          {isSystemCircle ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {t('Built-in')}
            </span>
          ) : null}
        </span>
      </HybridLink>

      <div className="ml-9 flex flex-col gap-2">
        {circle.description ? (
          <small className="text-slate-400">{circle.description}</small>
        ) : null}

        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <CircleFact label={t('Owned by')}>
            {circle.appId ? (
              owningApp ? (
                <HybridLink
                  href={`/owner/third-parties/apps/${encodeURIComponent(owningApp.appId)}`}
                  className="hover:underline"
                >
                  {owningApp.name}
                </HybridLink>
              ) : (
                <span className="font-mono break-all">{circle.appId}</span>
              )
            ) : (
              t('You (not owned by an app)')
            )}
          </CircleFact>

          {circle.designation !== undefined ? (
            <CircleFact label={t('Designation')}>
              {t(CircleDesignation[circle.designation] ?? `${circle.designation}`)}
            </CircleFact>
          ) : null}

          {circle.grantOn !== undefined ? (
            <CircleFact label={t('Granted on')}>
              {t(CircleGrantOn[circle.grantOn] ?? `${circle.grantOn}`)}
            </CircleFact>
          ) : null}

          <CircleFact label={t('Enabled')}>{circle.disabled ? t('No') : t('Yes')}</CircleFact>

          {created ? <CircleFact label={t('Created')}>{created}</CircleFact> : null}
          {lastUpdated ? <CircleFact label={t('Last updated')}>{lastUpdated}</CircleFact> : null}

          {circle.id ? (
            <CircleFact label={t('Id')}>
              <span className="font-mono break-all text-slate-400">{circle.id}</span>
            </CircleFact>
          ) : null}
        </dl>

        <div>
          <h4 className="text-sm font-medium">{t('Permissions')}</h4>
          {permissionKeys.length ? (
            <ul className="flex flex-row flex-wrap gap-2 text-sm text-slate-400">
              {permissionKeys.map((key) => (
                <li key={key} className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                  {t(getPermissionKeyName(key))}
                </li>
              ))}
            </ul>
          ) : (
            <SubtleMessage>{t('No permissions')}</SubtleMessage>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium">{t('Drives')}</h4>
          <DriveGrantList grants={circle.driveGrants ?? []} drives={drives} />
        </div>
      </div>
    </div>
  );
};

const CircleFact = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="text-slate-400">{label}</dt>
    <dd>{children}</dd>
  </>
);

const DriveGrantList = ({
  grants,
  drives,
}: {
  grants: DriveGrant[];
  drives: DriveDefinition[] | undefined;
}) => {
  if (!grants.length) return <SubtleMessage>{t('No drives')}</SubtleMessage>;

  return (
    <div className="flex flex-col gap-1">
      {grants.map((grant) => (
        <DriveGrantRow
          grant={grant}
          drives={drives}
          key={`${grant.permissionedDrive?.drive?.alias}-${grant.permissionedDrive?.drive?.type}`}
        />
      ))}
    </div>
  );
};

const DriveGrantRow = ({
  grant,
  drives,
}: {
  grant: DriveGrant;
  drives: DriveDefinition[] | undefined;
}) => {
  const targetDrive = grant.permissionedDrive?.drive;

  // Resolved against the already-fetched drive list rather than a query per row. A grant can
  // point at a drive that is gone (or that this page never fetched), so fall back to the alias.
  const drive = targetDrive
    ? (drives ?? []).find((d) => drivesEqual(d.targetDriveInfo, targetDrive))
    : undefined;

  const permission = t(getDrivePermissionFromNumber(grant.permissionedDrive?.permission));

  return (
    <div className="flex flex-row items-center">
      <HardDrive className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400" />
      {drive ? (
        <HybridLink
          href={`/owner/drives/${drive.targetDriveInfo.alias}_${drive.targetDriveInfo.type}`}
          className="hover:underline"
        >
          <DriveLabel drive={drive} permission={permission} />
        </HybridLink>
      ) : (
        <span className="text-slate-400">
          {targetDrive?.alias ? (
            <span className="font-mono break-all">{targetDrive.alias}</span>
          ) : (
            t('Unknown drive')
          )}
          {`: ${permission}`}
        </span>
      )}
    </div>
  );
};

const DriveLabel = ({ drive, permission }: { drive: DriveDefinition; permission: string }) => (
  <span>
    {drive.name}
    {drive.driveSlug ? (
      <span className="ml-2 font-mono text-sm text-slate-400 break-all">{drive.driveSlug}</span>
    ) : null}
    <span className="text-slate-400">{`: ${permission}`}</span>
  </span>
);

export default Overview;
