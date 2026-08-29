import {
  t,
  ActionLink,
  LoadingBlock,
  PageMeta,
  SubtleMessage,
  useCircles,
  HybridLink,
} from '@homebase-id/common-app';
import {
  Arrow,
  Circles as CirclesIcon,
  Grid,
  HardDrive,
  Triangle,
} from '@homebase-id/common-app/icons';
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
 * owns or authorizes, and the drives and permissions reachable through either path. Everything
 * here links out to the existing detail pages; nothing on this page edits.
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
          'Every app you have registered, the circles each app owns or authorizes, and the drives and permissions reachable through either. Use it to see at a glance who can reach what.'
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
              <CircleGrid circles={unattachedCircles} apps={apps} drives={drives} />
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
  const directPermissions = app.grant?.permissionSet?.keys ?? [];
  const circleMemberGrants = app.circleMemberPermissionSetGrantRequest?.drives ?? [];
  const circleMemberPermissions =
    app.circleMemberPermissionSetGrantRequest?.permissionSet?.keys ?? [];

  const [isOpen, setIsOpen] = useState(false);

  const ownedCircles = (circles ?? []).filter((circle) =>
    stringGuidsEqual(app.appId, circle.appId)
  );

  const authorizedCircles = (app.authorizedCircles ?? [])
    .map((circleId) => (circles ?? []).find((circle) => stringGuidsEqual(circle.id, circleId)))
    .filter((circle): circle is CircleDefinition => !!circle);

  return (
    <Section
      title={
        // The whole heading toggles; navigation to the app lives in its own action so that
        // reaching for the name never leaves the page.
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="-my-1 -ml-1 flex flex-row flex-wrap items-baseline gap-2 rounded p-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isOpen ? t('Collapse') : t('Expand')}
        >
          <Triangle
            className={`h-3 w-3 flex-shrink-0 self-center transition-transform ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
          <span>{app.name}</span>
          {app.isRevoked ? (
            <span className="rounded bg-red-100 px-2 py-1 text-sm text-red-700 dark:bg-red-900 dark:text-red-100">
              {t('Revoked')}
            </span>
          ) : null}
          {app.appSlug ? (
            <span className="break-all font-mono text-sm font-normal text-slate-400">
              {app.appSlug}
            </span>
          ) : null}
          {app.corsHostName ? (
            <span className="text-sm font-normal text-slate-400">{app.corsHostName}</span>
          ) : null}
        </button>
      }
      actions={
        <ActionLink
          type="mute"
          size="square"
          icon={Arrow}
          href={`/owner/third-parties/apps/${encodeURIComponent(app.appId)}`}
          title={t('Open app details')}
        />
      }
    >
      <div className={`flex flex-col gap-3 ${isOpen ? '' : 'hidden'}`}>
        <Collapsible title={t('Details')}>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr_max-content_1fr]">
            <Fact label={t('App id')}>
              <span className="break-all font-mono text-slate-400">{app.appId}</span>
            </Fact>
            {app.appSlug ? (
              <Fact label={t('Slug')}>
                <span className="break-all font-mono text-slate-400">{app.appSlug}</span>
              </Fact>
            ) : null}
            <Fact label={t('CORS host')}>
              {app.corsHostName || <span className="text-slate-400">{t('None')}</span>}
            </Fact>
            <Fact label={t('Revoked')}>
              {app.isRevoked || app.grant?.isRevoked ? t('Yes') : t('No')}
            </Fact>
            <Fact label={t('Peer access (ICR key)')}>
              {app.grant?.hasIcrKey === undefined
                ? t('Unknown')
                : app.grant.hasIcrKey
                  ? t('Yes')
                  : t('No')}
            </Fact>
            {formatTimestamp(app.created) ? (
              <Fact label={t('First used')}>{formatTimestamp(app.created)}</Fact>
            ) : null}
            {formatTimestamp(app.modified) ? (
              <Fact label={t('Last updated')}>{formatTimestamp(app.modified)}</Fact>
            ) : null}
          </dl>
        </Collapsible>

        {/* What the app holds when you use it, beside what it hands to your connections through
            the circles it authorizes: one row on a wide screen, stacked once there is no room. */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Collapsible
            title={t('The app itself')}
            count={directPermissions.length + directGrants.length}
          >
            <PanelBlock label={t('Permissions')}>
              <PermissionKeyList keys={directPermissions} />
            </PanelBlock>
            <PanelBlock label={t('Drives')}>
              <DriveGrantList grants={directGrants} drives={drives} />
            </PanelBlock>
          </Collapsible>

          <Collapsible
            title={t('Access your connections get')}
            count={circleMemberPermissions.length + circleMemberGrants.length}
          >
            <PanelBlock label={t('Permissions')}>
              <PermissionKeyList keys={circleMemberPermissions} />
            </PanelBlock>
            <PanelBlock label={t('Drives')}>
              <DriveGrantList grants={circleMemberGrants} drives={drives} />
            </PanelBlock>
          </Collapsible>
        </div>

        <Collapsible title={t('Circles it owns')} count={ownedCircles.length}>
          {!ownedCircles.length ? (
            <SubtleMessage>{t('No circles owned by this app')}</SubtleMessage>
          ) : (
            <CircleGrid circles={ownedCircles} apps={apps} drives={drives} />
          )}
        </Collapsible>

        <Collapsible title={t('Authorized circles')} count={authorizedCircles.length}>
          {!authorizedCircles.length ? (
            <SubtleMessage>{t('No circles authorized on this app')}</SubtleMessage>
          ) : (
            <CircleGrid circles={authorizedCircles} apps={apps} drives={drives} />
          )}
        </Collapsible>
      </div>
    </Section>
  );
};

/**
 * Circles as cards across the full width: one per row on a phone, filling out to four on a wide
 * desktop. auto-fit rather than a fixed column count so the cards keep a readable minimum width
 * at every breakpoint instead of being squeezed.
 */
const CircleGrid = ({
  circles,
  apps,
  drives,
}: {
  circles: CircleDefinition[];
  apps: RedactedAppRegistration[] | undefined;
  drives: DriveDefinition[] | undefined;
}) => (
  <div className="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-4">
    {circles.map((circle) => (
      <CircleOverview circle={circle} apps={apps} drives={drives} key={circle.id} />
    ))}
  </div>
);

/**
 * A titled block that starts closed. Everything on this page is collapsed by default, so the count
 * is part of the header rather than the body: a closed section still has to say whether there is
 * anything inside it, otherwise the page is a list of labels that all look alike.
 */
const Collapsible = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 border-opacity-80 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex flex-row items-center gap-2 rounded-lg p-3 text-left font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        title={isOpen ? t('Collapse') : t('Expand')}
      >
        <Triangle
          className={`h-3 w-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        <span>{title}</span>
        {count !== undefined ? <span className="text-slate-400">{count}</span> : null}
      </button>
      <div className={`flex flex-col gap-3 px-3 pb-3 ${isOpen ? '' : 'hidden'}`}>{children}</div>
    </div>
  );
};

const PanelBlock = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <h4 className="mb-1 text-sm font-medium text-slate-400">{label}</h4>
    {children}
  </div>
);

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
    <div
      className={`flex flex-col gap-3 rounded-lg border border-gray-200 border-opacity-80 p-4 dark:border-gray-700 ${
        circle.disabled ? 'opacity-50' : ''
      }`}
    >
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

      {circle.description ? <small className="text-slate-400">{circle.description}</small> : null}

      <Collapsible title={t('Details')}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <Fact label={t('Owned by')}>
            {circle.appId ? (
              owningApp ? (
                <HybridLink
                  href={`/owner/third-parties/apps/${encodeURIComponent(owningApp.appId)}`}
                  className="hover:underline"
                >
                  {owningApp.name}
                </HybridLink>
              ) : (
                <span className="break-all font-mono">{circle.appId}</span>
              )
            ) : (
              t('You (not owned by an app)')
            )}
          </Fact>

          {circle.designation !== undefined ? (
            <Fact label={t('Designation')}>
              {t(CircleDesignation[circle.designation] ?? `${circle.designation}`)}
            </Fact>
          ) : null}

          {circle.grantOn !== undefined ? (
            <Fact label={t('Granted on')}>
              {t(CircleGrantOn[circle.grantOn] ?? `${circle.grantOn}`)}
            </Fact>
          ) : null}

          <Fact label={t('Enabled')}>{circle.disabled ? t('No') : t('Yes')}</Fact>

          {created ? <Fact label={t('Created')}>{created}</Fact> : null}
          {lastUpdated ? <Fact label={t('Last updated')}>{lastUpdated}</Fact> : null}

          {circle.id ? (
            <Fact label={t('Id')}>
              <span className="break-all font-mono text-slate-400">{circle.id}</span>
            </Fact>
          ) : null}
        </dl>
      </Collapsible>

      <Collapsible title={t('Permissions')} count={permissionKeys.length}>
        <PermissionKeyList keys={permissionKeys} />
      </Collapsible>

      <Collapsible title={t('Drives')} count={(circle.driveGrants ?? []).length}>
        <DriveGrantList grants={circle.driveGrants ?? []} drives={drives} />
      </Collapsible>
    </div>
  );
};

/** One label/value pair in a facts grid; used for both apps and circles. */
const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="text-slate-400">{label}</dt>
    <dd>{children}</dd>
  </>
);

/**
 * Named through getPermissionKeyName rather than AppPermissionType: that enum only covers the
 * keys an app may request, and anything it misses would otherwise read as 'none'.
 */
const PermissionKeyList = ({ keys }: { keys: number[] }) => {
  if (!keys.length) return <SubtleMessage>{t('No permissions')}</SubtleMessage>;

  return (
    <ul className="flex flex-row flex-wrap gap-2 text-sm text-slate-400">
      {keys.map((key) => (
        <li key={key} className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          {t(getPermissionKeyName(key))}
        </li>
      ))}
    </ul>
  );
};

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

  // Only app grants carry the flag; circle grants have no storage key concept, so undefined is
  // "not applicable" rather than "no key" and stays unlabelled.
  const storageKeyLabel = grant.hasStorageKey ? t('has storage key') : undefined;

  return (
    <div className="flex flex-row items-center">
      <HardDrive className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400" />
      {drive ? (
        <HybridLink
          href={`/owner/drives/${drive.targetDriveInfo.alias}_${drive.targetDriveInfo.type}`}
          className="hover:underline"
        >
          <DriveLabel drive={drive} permission={permission} extra={storageKeyLabel} />
        </HybridLink>
      ) : (
        <span className="text-slate-400">
          {targetDrive?.alias ? (
            <span className="break-all font-mono">{targetDrive.alias}</span>
          ) : (
            t('Unknown drive')
          )}
          {`: ${permission}`}
        </span>
      )}
    </div>
  );
};

const DriveLabel = ({
  drive,
  permission,
  extra,
}: {
  drive: DriveDefinition;
  permission: string;
  extra?: string;
}) => (
  <span>
    {drive.name}
    {drive.driveSlug ? (
      <span className="ml-2 break-all font-mono text-sm text-slate-400">{drive.driveSlug}</span>
    ) : null}
    <span className="text-slate-400">{`: ${permission}${extra ? `, ${extra}` : ''}`}</span>
  </span>
);

export default Overview;
