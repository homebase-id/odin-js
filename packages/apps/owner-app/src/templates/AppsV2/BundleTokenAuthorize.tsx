import { ReactNode, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  Alert,
  DomainHighlighter,
  LoadingBlock,
  t,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import {
  AppRegistrationV2,
  BundleAuthorizeParams,
  decodeBase64UrlJson,
  getBundleCancelUrl,
  getBundleRedirectUrl,
  issueBundleToken,
} from '@homebase-id/js-lib/auth';
import { getDomainFromUrl, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useAppRegistrationsV2 } from '../../hooks/appsV2/useAppRegistrationsV2';
import Section from '../../components/ui/Sections/Section';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import {
  Badge,
  DriveAccessList,
  OwnedDriveSummary,
  V2ErrorAlert,
} from '../../components/AppsV2/AppsV2Parts';
import { errorMessageOf, targetDriveKey } from '../../components/AppsV2/appsV2Helpers';
import { useDrives } from '../../hooks/drives/useDrives';

// /owner/bundle-tokens/authorize?p={base64url(JSON {primaryAppId, appIds, friendlyName, publicKey, redirectUri, state})}

const BundleTokenAuthorize = () => {
  const [searchParams] = useSearchParams();
  const param = searchParams.get('p');
  const params = useMemo(() => decodeBase64UrlJson<BundleAuthorizeParams>(param), [param]);

  if (!params || !params.primaryAppId || !params.publicKey || !params.redirectUri) {
    return (
      <Shell>
        <h1 className="mb-5 text-4xl dark:text-white">{t('Bad request')}</h1>
        <p>
          {t(
            'This sign-in link is missing its details (p), or they could not be read: it needs a primary app, a public key and a redirect address.'
          )}
        </p>
      </Shell>
    );
  }

  return <BundleConsent params={params} />;
};

const Shell = ({ children }: { children: ReactNode }) => (
  <section className="my-20">
    <div className="container mx-auto px-5">
      <div className="max-w-[45rem]">{children}</div>
    </div>
  </section>
);

const BundleConsent = ({ params }: { params: BundleAuthorizeParams }) => {
  const dotYouClient = useDotYouClientContext();
  const { data: registrations, isLoading, error: loadError } = useAppRegistrationsV2().fetch;
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | undefined>();

  // The primary app is always a member, and first.
  const appIds = [
    params.primaryAppId,
    ...(params.appIds ?? []).filter((id) => !stringGuidsEqual(id, params.primaryAppId)),
  ].filter((id, index, all) => all.findIndex((other) => stringGuidsEqual(other, id)) === index);

  const members = appIds.map((appId) => ({
    appId,
    isPrimary: stringGuidsEqual(appId, params.primaryAppId),
    registration: registrations?.find((r) => stringGuidsEqual(r.registration.appId, appId)),
  }));

  const blocking = registrations
    ? members.filter((m) => !m.registration || m.registration.registration.isRevoked)
    : [];

  const redirectHost = getDomainFromUrl(params.redirectUri) || params.redirectUri;
  const redirectOrigin = (() => {
    try {
      return new URL(params.redirectUri).host;
    } catch {
      return redirectHost;
    }
  })();

  const doAllow = async () => {
    setIsIssuing(true);
    setIssueError(undefined);
    try {
      const exchange = await issueBundleToken(dotYouClient, {
        primaryAppId: params.primaryAppId,
        appIds,
        friendlyName: params.friendlyName,
        jwkBase64UrlPublicKey: params.publicKey,
        redirectUri: params.redirectUri,
      });
      window.location.href = getBundleRedirectUrl(
        params.redirectUri,
        dotYouClient.getHostIdentity(),
        exchange,
        params.state ?? ''
      );
    } catch (error) {
      setIssueError(errorMessageOf(error));
      setIsIssuing(false);
    }
  };

  const doCancel = () =>
    (window.location.href = getBundleCancelUrl(params.redirectUri, params.state ?? ''));

  return (
    <Shell>
      <h1 className="mb-5 text-4xl dark:text-white">
        {t('Sign in to apps')}
        <small className="block">{params.friendlyName || t('Unnamed device')}</small>
        <small className="block text-base font-normal text-slate-400">
          {t('Returns to')} <DomainHighlighter>{redirectOrigin}</DomainHighlighter>
        </small>
      </h1>

      <p>
        {t('This device asks for one sign-in that works as each of these apps. It gets the access each app already has on your identity')}
        :
      </p>

      {isLoading ? (
        <>
          <LoadingBlock className="my-2 h-24" />
          <LoadingBlock className="my-2 h-24" />
        </>
      ) : null}
      <V2ErrorAlert error={loadError} title={t('Could not load your apps')} />

      {blocking.length ? (
        <Alert type="critical" title={t('This sign-in cannot be allowed')} className="my-5">
          <ul className="list-disc pl-5">
            {blocking.map((m) => (
              <li key={m.appId}>
                {m.registration
                  ? `"${m.registration.registration.name}" ${t('is revoked. Restore it first.')}`
                  : `${t('App')} ${m.appId} ${t('is not installed on your identity. Install it first.')}`}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {registrations
        ? members.map((member) => (
            <BundleAppCard
              key={member.appId}
              appId={member.appId}
              isPrimary={member.isPrimary}
              registration={member.registration}
              allRegistrations={registrations}
            />
          ))
        : null}

      {issueError ? <V2ErrorAlert error={issueError} title={t('Could not sign in')} /> : null}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row-reverse">
        <ActionButton
          onClick={doAllow}
          type="primary"
          icon={Arrow}
          state={isIssuing ? 'pending' : undefined}
          disabled={!registrations || blocking.length > 0 || isIssuing}
        >
          {t('Allow')}
        </ActionButton>
        <ActionButton type="secondary" onClick={doCancel} disabled={isIssuing}>
          {t('Cancel')}
        </ActionButton>
      </div>
    </Shell>
  );
};

const BundleAppCard = ({
  appId,
  isPrimary,
  registration,
  allRegistrations,
}: {
  appId: string;
  isPrimary: boolean;
  registration: AppRegistrationV2 | undefined;
  allRegistrations: AppRegistrationV2[];
}) => {
  const { data: drives } = useDrives().fetch;

  if (!registration) {
    return (
      <Section
        title={
          <span className="flex flex-row flex-wrap items-center gap-2">
            <span className="break-all font-mono text-base">{appId}</span>
            {isPrimary ? <Badge tone="primary">{t('Primary')}</Badge> : null}
            <Badge tone="critical">{t('Not installed')}</Badge>
          </span>
        }
      >
        <p className="text-slate-400">{t('This app is not installed on your identity.')}</p>
      </Section>
    );
  }

  const reg = registration.registration;
  const keys = reg.grant?.permissionSet?.keys ?? [];
  // Every app's owned drives, so each grant is labelled with the app that owns the drive.
  const owners = new Map(
    allRegistrations.flatMap((r) =>
      r.ownedDrives.map((d) => [targetDriveKey(d.targetDrive), { drive: d, app: r.registration }] as const)
    )
  );

  return (
    <Section
      title={
        <span className="flex flex-row flex-wrap items-center gap-2">
          {reg.name}
          {isPrimary ? <Badge tone="primary">{t('Primary')}</Badge> : null}
          {reg.isRevoked ? <Badge tone="critical">{t('Revoked')}</Badge> : null}
          {registration.isReserved ? <Badge>{t('Built-in')}</Badge> : null}
          <small className="block w-full font-mono text-sm font-normal text-slate-400">
            /apps/{reg.appSlug}
            {reg.corsHostName ? ` · ${reg.corsHostName}` : ''}
          </small>
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {registration.ownedDrives.length ? (
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-400">{t('Drives it owns')}</h3>
            <div className="flex flex-col gap-3">
              {registration.ownedDrives.map((drive) => (
                <OwnedDriveSummary drive={drive} appSlug={reg.appSlug} key={drive.driveId} />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-400">{t('Drive access')}</h3>
          <DriveAccessList
            empty={t('No drive access')}
            entries={(reg.grant?.driveGrants ?? []).map((grant) => {
              const drive = grant.permissionedDrive.drive;
              const owner = owners.get(targetDriveKey(drive));
              return {
                targetDrive: drive,
                permission: grant.permissionedDrive.permission,
                driveName:
                  owner?.drive.name ??
                  drives?.find((d) => targetDriveKey(d.targetDriveInfo) === targetDriveKey(drive))?.name,
                owningAppId: owner?.app.appId,
                owningAppName: owner?.app.name,
              };
            })}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-400">{t('Permissions')}</h3>
          {keys.length ? (
            <div className="flex flex-col gap-3">
              {keys.map((key) => (
                <PermissionView permission={key} key={key} />
              ))}
            </div>
          ) : (
            <p className="text-slate-400">{t('No special permissions')}</p>
          )}
        </div>
      </div>
    </Section>
  );
};

export default BundleTokenAuthorize;
