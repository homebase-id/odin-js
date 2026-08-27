import {
  t,
  LoadingBlock,
  PageMeta,
  SubtleMessage,
  useCircles,
  HybridLink,
} from '@homebase-id/common-app';
import { Circles as CirclesIcon, Grid, HardDrive } from '@homebase-id/common-app/icons';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import { CircleDefinition, DriveGrant } from '@homebase-id/js-lib/network';
import {
  drivesEqual,
  getDrivePermissionFromNumber,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';

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

  // Circles that no app authorizes still belong on an overview; they just grant nothing to an app.
  const unusedCircles = (circles ?? []).filter(
    (circle) =>
      !(apps ?? []).some((app) =>
        (app.authorizedCircles ?? []).some((circleId) => stringGuidsEqual(circleId, circle.id))
      )
  );

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
              <AppOverview app={app} circles={circles} drives={drives} key={app.appId} />
            ))
          )}

          {unusedCircles.length ? (
            <Section title={t('Circles not used by any app')}>
              <div className="flex flex-col gap-5">
                {unusedCircles.map((circle) => (
                  <CircleOverview circle={circle} drives={drives} key={circle.id} />
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
  circles,
  drives,
}: {
  app: RedactedAppRegistration;
  circles: CircleDefinition[] | undefined;
  drives: DriveDefinition[] | undefined;
}) => {
  const directGrants = app.grant?.driveGrants ?? [];
  const circleMemberGrants = app.circleMemberPermissionSetGrantRequest?.drives ?? [];

  const authorizedCircles = (app.authorizedCircles ?? [])
    .map((circleId) => (circles ?? []).find((circle) => stringGuidsEqual(circle.id, circleId)))
    .filter((circle): circle is CircleDefinition => !!circle);

  return (
    <Section
      title={
        <span className="flex flex-row flex-wrap items-baseline gap-2">
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
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="mb-2 font-medium">{t('Drives granted to the app')}</h3>
          <DriveGrantList grants={directGrants} drives={drives} />
        </div>

        <div>
          <h3 className="mb-2 font-medium">{t('Drives granted to members of its circles')}</h3>
          <DriveGrantList grants={circleMemberGrants} drives={drives} />
        </div>

        <div>
          <h3 className="mb-2 font-medium">{t('Authorized circles')}</h3>
          {!authorizedCircles.length ? (
            <SubtleMessage>{t('No circles authorized on this app')}</SubtleMessage>
          ) : (
            <div className="flex flex-col gap-4">
              {authorizedCircles.map((circle) => (
                <CircleOverview circle={circle} drives={drives} key={circle.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

const CircleOverview = ({
  circle,
  drives,
}: {
  circle: CircleDefinition;
  drives: DriveDefinition[] | undefined;
}) => {
  return (
    <div className={`flex flex-col ${circle.disabled ? 'opacity-50' : ''}`}>
      <HybridLink
        href={`/owner/circles/${encodeURIComponent(circle.id ?? '')}`}
        className="flex flex-row items-center hover:underline"
      >
        <CirclesIcon className="mr-3 h-6 w-6 flex-shrink-0" />
        <span>
          {circle.disabled ? `${t('Disabled')}: ` : ''}
          {circle.name}
        </span>
      </HybridLink>
      {circle.description ? (
        <small className="ml-9 text-slate-400">{circle.description}</small>
      ) : null}
      <div className="ml-9 mt-1">
        <DriveGrantList grants={circle.driveGrants ?? []} drives={drives} />
      </div>
    </div>
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
