import {
  t,
  ActionLink,
  LoadingBlock,
  PageMeta,
  SubtleMessage,
  useCircles,
} from '@homebase-id/common-app';
import { Arrow, Grid, Triangle } from '@homebase-id/common-app/icons';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import { CircleDefinition } from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useState } from 'react';
import Section from '../../../components/ui/Sections/Section';
import Submenu from '../../../components/SubMenu/SubMenu';
import { useApps } from '../../../hooks/apps/useApps';
import { useDrives } from '../../../hooks/drives/useDrives';
import { RedactedAppRegistration } from '../../../provider/app/AppManagementProviderTypes';
import {
  CircleGrid,
  CircleMemberIdentities,
  Collapsible,
  DriveGrantList,
  Fact,
  PanelBlock,
  PermissionKeyList,
  formatTimestamp,
} from '../../../components/Apps/AppOverviewParts';

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
            <PanelBlock label={t('Who gets it')}>
              <CircleMemberIdentities
                appName={app.name}
                circles={authorizedCircles}
                grants={circleMemberGrants}
                drives={drives}
              />
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

export default Overview;
