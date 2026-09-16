import { useParams } from 'react-router-dom';
import {
  Alert,
  HybridLink,
  LoadingBlock,
  PageMeta,
  SubtleMessage,
  t,
  useCircles,
} from '@homebase-id/common-app';
import { Grid } from '@homebase-id/common-app/icons';
import { DriveAccessEntry, TargetDriveV2 } from '@homebase-id/js-lib/auth';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import Section from '../../components/ui/Sections/Section';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import { CircleOverview, Fact, formatTimestamp, PermissionKeyList } from '../../components/Apps/AppOverviewParts';
import {
  Badge,
  BundleTokenList,
  CircleGrantedDrives,
  DriveAccessList,
  OwnedDriveSummary,
  V2ErrorAlert,
} from '../../components/AppsV2/AppsV2Parts';
import { targetDriveKey, toCircleDefinition } from '../../components/AppsV2/appsV2Helpers';
import { useAppRegistrationsV2, useAppRegistrationV2 } from '../../hooks/appsV2/useAppRegistrationsV2';
import { useBundleTokens } from '../../hooks/appsV2/useBundleTokens';
import { useDrives } from '../../hooks/drives/useDrives';
import { useApps } from '../../hooks/apps/useApps';

/** `/owner/apps-v2/:appId`: one registration, what it owns and reaches, and its bundle tokens. */
const AppV2Details = () => {
  const { appId: appIdParam } = useParams();
  const appId = appIdParam ? decodeURIComponent(appIdParam) : undefined;

  const { data: app, isLoading, error } = useAppRegistrationV2(appId).fetch;
  const { data: allApps } = useAppRegistrationsV2().fetch;
  const { data: v1Apps } = useApps().fetchRegistered;
  const { data: tokens, error: tokensError } = useBundleTokens({ appId }).fetch;
  const { data: drives } = useDrives().fetch;
  const { data: circles } = useCircles().fetch;

  if (isLoading) return <LoadingBlock className="h-32" />;
  if (error) return <V2ErrorAlert error={error} title={t('Could not load this app')} />;
  if (!app || !appId) return <>{t('No matching app found')}</>;

  const reg = app.registration;

  const owners = new Map(
    (allApps ?? []).flatMap((other) =>
      other.ownedDrives.map((drive) => [targetDriveKey(drive.targetDrive), { drive, app: other.registration }] as const)
    )
  );
  const driveName = (drive: TargetDriveV2) =>
    owners.get(targetDriveKey(drive))?.drive.name ??
    drives?.find((d) => targetDriveKey(d.targetDriveInfo) === targetDriveKey(drive))?.name;

  const driveAccess: DriveAccessEntry[] = (reg.grant?.driveGrants ?? []).map((grant) => {
    const drive = grant.permissionedDrive.drive;
    const owner = owners.get(targetDriveKey(drive));
    return {
      targetDrive: drive,
      permission: grant.permissionedDrive.permission,
      driveName: driveName(drive),
      owningAppId: owner?.app.appId,
      owningAppName: owner?.app.name,
    };
  });

  const authorizedCircles = (reg.authorizedCircles ?? []).map((circleId) => ({
    id: circleId,
    circle: circles?.find((c) => stringGuidsEqual(c.id, circleId)),
  }));
  const memberGrant = reg.circleMemberPermissionSetGrantRequest;
  const keys = reg.grant?.permissionSet?.keys ?? [];

  return (
    <>
      <PageMeta
        icon={Grid}
        browserTitle={reg.name}
        title={
          <span>
            {reg.name}
            {reg.corsHostName ? <small className="block text-sm">{reg.corsHostName}</small> : null}
          </span>
        }
        breadCrumbs={[{ href: '/owner/apps-v2', title: t('Apps (V2)') }, { title: reg.name }]}
        actions={
          <HybridLink
            href={`/owner/third-parties/apps/${encodeURIComponent(reg.appId)}`}
            className="my-auto text-sm hover:underline"
          >
            {t('Open in app settings')}
          </HybridLink>
        }
      />

      {reg.isRevoked ? (
        <Alert type="critical" title={t('App is revoked')} className="mb-5">
          {t('This app is revoked; its bundle tokens cannot act as it until it is restored.')}
        </Alert>
      ) : null}

      <Section title={t('Details')}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <Fact label={t('App id')}>
            <span className="break-all font-mono text-slate-400">{reg.appId}</span>
          </Fact>
          <Fact label={t('Slug')}>
            {reg.appSlug ? <span className="font-mono">/apps/{reg.appSlug}</span> : t('None')}
          </Fact>
          <Fact label={t('CORS host')}>{reg.corsHostName || t('None')}</Fact>
          <Fact label={t('Kind')}>
            {app.isReserved ? <Badge>{t('Built-in (reserved)')}</Badge> : <Badge>{t('Third party')}</Badge>}
          </Fact>
          <Fact label={t('Revoked')}>{reg.isRevoked || reg.grant?.isRevoked ? t('Yes') : t('No')}</Fact>
          {app.created ? <Fact label={t('Registered')}>{formatTimestamp(app.created)}</Fact> : null}
          {reg.modified ? <Fact label={t('Last updated')}>{formatTimestamp(reg.modified)}</Fact> : null}
        </dl>
      </Section>

      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-2">
        <Section title={`${t('Drives it owns')} (${app.ownedDrives.length})`}>
          {app.ownedDrives.length ? (
            <div className="flex flex-col gap-4">
              {app.ownedDrives.map((drive) => (
                <OwnedDriveSummary drive={drive} appSlug={reg.appSlug} key={drive.driveId} />
              ))}
            </div>
          ) : (
            <SubtleMessage>{t('No drives owned by this app')}</SubtleMessage>
          )}
        </Section>

        <Section title={`${t('Circles it owns')} (${app.ownedCircles.length})`}>
          {app.ownedCircles.length ? (
            <div className="flex flex-col gap-4">
              {app.ownedCircles.map((circle) => (
                <CircleOverview
                  circle={toCircleDefinition(circle)}
                  apps={v1Apps}
                  drives={drives}
                  key={circle.id}
                />
              ))}
            </div>
          ) : (
            <SubtleMessage>{t('No circles owned by this app')}</SubtleMessage>
          )}
        </Section>
      </div>

      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-2">
        <Section title={t('Drive access')}>
          <DriveAccessList entries={driveAccess} empty={t("This app doesn't have any drive access")} />
        </Section>
        <Section title={t('Permissions')}>
          {keys.length ? (
            <div className="flex flex-col gap-4">
              {keys.map((key) => (
                <PermissionView permission={key} key={key} />
              ))}
            </div>
          ) : (
            <SubtleMessage>{t("This app doesn't have any special permissions")}</SubtleMessage>
          )}
        </Section>
      </div>

      <Section title={`${t('Circles this app works with')} (${authorizedCircles.length})`}>
        {authorizedCircles.length ? (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1">
              {authorizedCircles.map(({ id, circle }) => (
                <li key={id}>
                  <HybridLink href={`/owner/circles/${encodeURIComponent(id)}`} className="hover:underline">
                    {circle ? `${circle.emoji ? `${circle.emoji} ` : ''}${circle.name}` : id}
                  </HybridLink>
                </li>
              ))}
            </ul>
            <div>
              <p className="mb-1 text-sm text-slate-400">{t('Members of these circles get')}:</p>
              <CircleGrantedDrives grants={memberGrant?.drives ?? []} driveName={driveName} />
              {memberGrant?.permissionSet?.keys?.length ? (
                <div className="mt-2">
                  <PermissionKeyList keys={memberGrant.permissionSet.keys} />
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <SubtleMessage>{t('No authorized circles')}</SubtleMessage>
        )}
      </Section>

      <Section
        title={`${t('Bundle tokens')} (${tokens?.length ?? 0})`}
        actions={
          <HybridLink
            href={`/owner/bundle-tokens?appId=${encodeURIComponent(reg.appId)}`}
            className="text-sm hover:underline"
          >
            {t('Open list')}
          </HybridLink>
        }
      >
        <V2ErrorAlert error={tokensError} title={t('Could not load bundle tokens')} />
        <BundleTokenList
          tokens={tokens}
          highlightAppId={reg.appId}
          empty={t('No bundle tokens reach this app')}
        />
      </Section>
    </>
  );
};

export default AppV2Details;
