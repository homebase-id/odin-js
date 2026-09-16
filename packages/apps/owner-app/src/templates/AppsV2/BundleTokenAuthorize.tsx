import { ReactNode, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ActionButton,
  DomainHighlighter,
  LoadingBlock,
  t,
  useCircles,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Arrow, Loader } from '@homebase-id/common-app/icons';
import {
  authorizeBundle,
  BundleAppPreview,
  BundleAppRequest,
  BundleAuthorizationPreview,
  BundleAuthorizationRequest,
  BundleAuthorizeParams,
  getBundleCancelUrl,
  getBundleRedirectUrl,
  readBundleAuthorizeParams,
  TargetDriveV2,
} from '@homebase-id/js-lib/auth';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useDrives } from '../../hooks/drives/useDrives';
import { useBundleAuthorizationPreview } from '../../hooks/appsV2/useBundleAuthorizationPreview';
import { invalidateAppRegistrationsV2 } from '../../hooks/appsV2/useAppRegistrationsV2';
import { invalidateBundleTokens } from '../../hooks/appsV2/useBundleTokens';
import Section from '../../components/ui/Sections/Section';
import { Badge, ProblemsList, V2ErrorAlert } from '../../components/AppsV2/AppsV2Parts';
import { errorMessageOf, targetDriveKey } from '../../components/AppsV2/appsV2Helpers';
import { ValidationDiffSummary } from '../../components/AppsV2/ValidationDiffSummary';
import {
  clearStashedBundleAuthorizeFragment,
  readStashedBundleAuthorizeFragment,
} from './bundleAuthorizeFragment';

// /owner/bundle-tokens/authorize#p={base64url(JSON {primaryAppId, apps: [{appId, manifest?}], friendlyName, publicKey, redirectUri, state})}
// (older links carry p in the query string, with appIds instead of apps)

const BundleTokenAuthorize = () => {
  const location = useLocation();
  const params = useMemo(
    () =>
      readBundleAuthorizeParams(location.hash, location.search) ??
      // Arrived without the fragment (after logging in): use the one stashed on first load.
      readBundleAuthorizeParams(readStashedBundleAuthorizeFragment(), ''),
    [location.hash, location.search]
  );

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

/** The primary app is always a member and first; duplicates are left for the server to report. */
const orderedApps = (params: BundleAuthorizeParams): BundleAppRequest[] => {
  const apps = params.apps ?? [];
  const primary = apps.find((app) => stringGuidsEqual(app.appId, params.primaryAppId)) ?? {
    appId: params.primaryAppId,
  };
  return [primary, ...apps.filter((app) => !stringGuidsEqual(app.appId, params.primaryAppId))];
};

const BundleConsent = ({ params }: { params: BundleAuthorizeParams }) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const { data: drives } = useDrives().fetch;
  const { data: circles } = useCircles().fetch;

  const allApps = useMemo(() => orderedApps(params), [params]);
  const [deselected, setDeselected] = useState<string[]>([]);
  const isSelected = (appId: string) =>
    stringGuidsEqual(appId, params.primaryAppId) ||
    !deselected.some((id) => stringGuidsEqual(id, appId));

  const request: BundleAuthorizationRequest = useMemo(
    () => ({
      primaryAppId: params.primaryAppId,
      apps: allApps.filter(
        (app) =>
          stringGuidsEqual(app.appId, params.primaryAppId) ||
          !deselected.some((id) => stringGuidsEqual(id, app.appId))
      ),
      friendlyName: params.friendlyName,
      redirectUri: params.redirectUri,
    }),
    [params, allApps, deselected]
  );

  const {
    data: preview,
    isFetching,
    isPlaceholderData,
    error: previewError,
  } = useBundleAuthorizationPreview(request);

  // The first answer covers every app, so deselected apps can still be named on their cards.
  const [firstPreview, setFirstPreview] = useState<BundleAuthorizationPreview | undefined>();
  if (preview && !firstPreview && !deselected.length && !isPlaceholderData)
    setFirstPreview(preview);

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizeError, setAuthorizeError] = useState<string | undefined>();

  const redirectOrigin = (() => {
    try {
      return new URL(params.redirectUri).host;
    } catch {
      return params.redirectUri;
    }
  })();

  const currentPreview = preview && !isPlaceholderData ? preview : undefined;

  const previewFor = (appId: string): BundleAppPreview | undefined =>
    currentPreview?.apps.find((app) => stringGuidsEqual(app.appId, appId)) ??
    preview?.apps.find((app) => stringGuidsEqual(app.appId, appId)) ??
    firstPreview?.apps.find((app) => stringGuidsEqual(app.appId, appId));

  const driveName = (drive: TargetDriveV2) => {
    const key = targetDriveKey(drive);
    for (const app of allApps) {
      const owned = app.manifest?.ownedDrives?.find((d) => targetDriveKey(d.targetDrive) === key);
      if (owned) return owned.name;
    }
    for (const app of preview?.apps ?? []) {
      const entry = app.validation?.diff.driveAccess.find(
        (d) => targetDriveKey(d.targetDrive) === key
      );
      if (entry?.driveName) return entry.driveName;
    }
    return drives?.find((d) => targetDriveKey(d.targetDriveInfo) === key)?.name;
  };

  const circleName = (circleId: string) =>
    circles?.find((c) => stringGuidsEqual(c.id, circleId))?.name ??
    allApps
      .flatMap((app) => app.manifest?.ownedCircles ?? [])
      .find((c) => stringGuidsEqual(c.id, circleId))?.name ??
    circleId;

  const toggle = (appId: string) => {
    if (stringGuidsEqual(appId, params.primaryAppId)) return;
    setAuthorizeError(undefined);
    setDeselected((current) =>
      current.some((id) => stringGuidsEqual(id, appId))
        ? current.filter((id) => !stringGuidsEqual(id, appId))
        : [...current, appId]
    );
  };

  // Allow only on an answer for exactly the current selection.
  const canAllow = !!currentPreview && !isFetching && currentPreview.isValid;

  const doAllow = async () => {
    setIsAuthorizing(true);
    setAuthorizeError(undefined);
    try {
      const exchange = await authorizeBundle(dotYouClient, {
        ...request,
        jwkBase64UrlPublicKey: params.publicKey,
      });
      invalidateAppRegistrationsV2(queryClient);
      invalidateBundleTokens(queryClient);
      clearStashedBundleAuthorizeFragment();
      window.location.href = getBundleRedirectUrl(
        params.redirectUri,
        dotYouClient.getHostIdentity(),
        exchange,
        params.state ?? ''
      );
    } catch (error) {
      // Applying is retry-safe server-side; re-check so the screen reflects anything already applied.
      invalidateAppRegistrationsV2(queryClient);
      queryClient.invalidateQueries({ queryKey: ['bundle-authorization-preview'] });
      setAuthorizeError(errorMessageOf(error));
      setIsAuthorizing(false);
    }
  };

  const doCancel = () => {
    clearStashedBundleAuthorizeFragment();
    window.location.href = getBundleCancelUrl(params.redirectUri, params.state ?? '');
  };

  const selectedCount = request.apps.length;

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
        {t(
          'This device asks for one sign-in that works as each of these apps. Apps that are new or changed are installed or updated when you allow. Untick any app you do not want to include.'
        )}
      </p>

      {!preview && isFetching ? (
        <>
          <LoadingBlock className="my-2 h-24" />
          <LoadingBlock className="my-2 h-24" />
        </>
      ) : null}
      <V2ErrorAlert error={previewError} title={t('Could not check this sign-in')} />

      {currentPreview ? (
        <ProblemsList
          problems={currentPreview.problems}
          title={t('This sign-in cannot be allowed')}
        />
      ) : null}

      {preview || firstPreview
        ? allApps.map((app) => (
            <BundleAppCard
              key={app.appId}
              request={app}
              preview={previewFor(app.appId)}
              isPrimary={stringGuidsEqual(app.appId, params.primaryAppId)}
              isSelected={isSelected(app.appId)}
              isStale={!currentPreview || isFetching}
              onToggle={() => toggle(app.appId)}
              disabled={isAuthorizing}
              driveName={driveName}
              circleName={circleName}
            />
          ))
        : null}

      <V2ErrorAlert error={authorizeError} title={t('Could not sign in')} />

      <div className="mt-8 flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
        <ActionButton
          onClick={doAllow}
          type="primary"
          icon={Arrow}
          state={isAuthorizing ? 'pending' : undefined}
          disabled={!canAllow || isAuthorizing}
        >
          {selectedCount > 1 ? `${t('Allow')} ${selectedCount} ${t('apps')}` : t('Allow')}
        </ActionButton>
        <ActionButton type="secondary" onClick={doCancel} disabled={isAuthorizing}>
          {t('Cancel')}
        </ActionButton>
        {isFetching && preview ? (
          <span className="flex flex-row items-center gap-2 text-sm text-slate-400 sm:mr-auto">
            <Loader className="h-4 w-4" /> {t('Checking your selection...')}
          </span>
        ) : null}
      </div>
    </Shell>
  );
};

const actionLabel = (app: BundleAppPreview) => {
  const action = `${app.action ?? ''}`.toLowerCase();
  if (action === 'install') return t('Install');
  if (action === 'update') return t('Update');
  if (app.hasManifest) return t('No changes');
  return app.isRegistered ? t('Already registered') : t('Not installed');
};

/** One line for a collapsed card: what allowing does to this app. */
const changeSummary = (app: BundleAppPreview | undefined) => {
  const diff = app?.validation?.diff;
  if (!app || !diff) {
    return app?.isRegistered
      ? t('Already installed; it keeps the access it has.')
      : t('Checking...');
  }

  const parts: string[] = [];
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  if (diff.drivesToCreate.length || diff.circlesToCreate.length) {
    parts.push(
      `${t('creates')} ${[
        diff.drivesToCreate.length
          ? count(diff.drivesToCreate.length, t('drive'), t('drives'))
          : '',
        diff.circlesToCreate.length
          ? count(diff.circlesToCreate.length, t('circle'), t('circles'))
          : '',
      ]
        .filter(Boolean)
        .join(` ${t('and')} `)}`
    );
  }
  if (diff.driveAccessGained.length) {
    parts.push(
      `${t('gains access to')} ${count(diff.driveAccessGained.length, t('drive'), t('drives'))}`
    );
  }
  if (diff.driveAccessLost.length) {
    parts.push(
      `${t('loses access to')} ${count(diff.driveAccessLost.length, t('drive'), t('drives'))}`
    );
  }
  if (diff.permissionKeysGained.length || diff.permissionKeysLost.length) {
    parts.push(t('changes its permissions'));
  }
  if (diff.authorizedCirclesAdded.length || diff.authorizedCirclesRemoved.length) {
    parts.push(t('changes which circles can use it'));
  }

  if (!parts.length) return t('Nothing changes: the app is up to date.');
  const sentence = parts.join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

const BundleAppCard = ({
  request,
  preview,
  isPrimary,
  isSelected,
  isStale,
  onToggle,
  disabled,
  driveName,
  circleName,
}: {
  request: BundleAppRequest;
  preview: BundleAppPreview | undefined;
  isPrimary: boolean;
  isSelected: boolean;
  isStale: boolean;
  onToggle: () => void;
  disabled: boolean;
  driveName: (drive: TargetDriveV2) => string | undefined;
  circleName: (circleId: string) => string;
}) => {
  const name = preview?.name || request.manifest?.name || request.appId;
  const appSlug = preview?.appSlug || request.manifest?.appSlug;
  const validation = preview?.validation;
  const problems = [...(preview?.problems ?? []), ...(validation?.problems ?? [])];
  const action = `${preview?.action ?? ''}`.toLowerCase();
  const inputId = `bundle-app-${request.appId}`;
  const [isDetails, setIsDetails] = useState(false);

  return (
    <Section
      className={isSelected ? '' : 'opacity-60'}
      title={
        <label htmlFor={inputId} className="flex cursor-pointer flex-row items-start gap-3">
          <input
            id={inputId}
            type="checkbox"
            className="mt-2 h-4 w-4"
            checked={isSelected}
            disabled={isPrimary || disabled}
            onChange={onToggle}
            title={isPrimary ? t('The primary app is always included') : undefined}
          />
          <span className="flex flex-col">
            <span className="flex flex-row flex-wrap items-center gap-2">
              {name}
              {isPrimary ? <Badge tone="primary">{t('Primary')}</Badge> : null}
              {preview?.isReserved ? <Badge>{t('Built-in')}</Badge> : null}
              {preview?.isRevoked ? <Badge tone="critical">{t('Revoked')}</Badge> : null}
              {preview ? (
                <Badge
                  tone={
                    isSelected && problems.length
                      ? 'critical'
                      : action === 'install' || action === 'update'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {actionLabel(preview)}
                </Badge>
              ) : null}
            </span>
            {appSlug ? (
              <small className="font-mono text-sm font-normal text-slate-400">
                /apps/{appSlug}
              </small>
            ) : null}
          </span>
        </label>
      }
    >
      {!isSelected ? (
        <p className="text-slate-400">
          {t('Not included: this app will not be installed, changed or signed in.')}
        </p>
      ) : (
        <div className={isStale ? 'opacity-70' : ''}>
          {/* Problems stay visible: they are what blocks Allow. */}
          {problems.length ? <ProblemsList problems={problems} /> : null}
          <p className="text-slate-500 dark:text-slate-400">{changeSummary(preview)}</p>
          {validation && request.manifest ? (
            <>
              <button
                type="button"
                onClick={() => setIsDetails(!isDetails)}
                className={`mt-2 flex flex-row items-center ${isDetails ? 'font-bold' : 'text-sm italic'}`}
              >
                {t('Details')}
                <Arrow
                  className={`ml-2 h-5 w-5 transition-transform ${isDetails ? 'rotate-90' : ''}`}
                />
              </button>
              {isDetails ? (
                <ValidationDiffSummary
                  manifest={request.manifest}
                  validation={validation}
                  driveName={driveName}
                  circleName={circleName}
                  compact={true}
                />
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </Section>
  );
};

export default BundleTokenAuthorize;
