import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle } from 'lucide-react';
import { t, ActionButton, Label, useDotYouClient } from '@homebase-id/common-app';
import { Arrow, Chevron, Loader } from '@homebase-id/common-app/icons';
import {
  forceVersionUpgrade,
  getDataVersionInfo,
  getUpgradeStatus,
  VersionInfoResult,
} from '../../provider/system/DataConversionProvider';
import { RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import { TimeAgoUtc } from '../../components/ui/Date/TimeAgoUtc';

// How often to re-check the data version while an upgrade is running.
const POLL_INTERVAL_MS = 3000;

type UpgradePhase =
  | 'checking' // probing the server to find out what needs to happen
  | 'running' // an upgrade is in progress (detected or triggered) -> spinner
  | 'done' // the data is up to date
  | 'error'; // the check or trigger failed

// Schemes we refuse to navigate to (XSS / local-file risks). Everything else is
// allowed: `http(s)` for web apps and custom schemes for native mobile/desktop apps.
const BLOCKED_RETURN_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'blob:', 'file:'];

// Returns the raw returnUrl if it parses and isn't a blocked scheme; otherwise undefined.
const resolveReturnUrl = (returnUrl: string | null): string | undefined => {
  if (!returnUrl) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(returnUrl, window.location.origin);
  } catch {
    return undefined;
  }

  if (BLOCKED_RETURN_SCHEMES.includes(parsed.protocol.toLowerCase())) return undefined;

  return returnUrl;
};

const DataUpgrade = () => {
  const [searchParams] = useSearchParams();
  const { getDotYouClient } = useDotYouClient();
  const dotYouClient = useMemo(() => getDotYouClient(), []);

  const [phase, setPhase] = useState<UpgradePhase>('checking');
  const [versionInfo, setVersionInfo] = useState<VersionInfoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The app that sent the user here; we redirect back to it once the upgrade succeeds.
  // The caller may be a web app, or a native mobile/desktop app passing a deep link.
  // `returnUrl` is the agreed param; `return` is also accepted to match the app flows.
  const returnUrl = useMemo(
    () => resolveReturnUrl(searchParams.get(RETURN_URL_PARAM) ?? searchParams.get('return')),
    [searchParams]
  );

  const refreshVersionInfo = async () => {
    try {
      setVersionInfo(await getDataVersionInfo(dotYouClient));
    } catch (err) {
      console.warn('Failed to load data version info', err);
    }
  };

  // Triggers the upgrade and switches to the spinner; the polling effect resolves the result.
  const beginUpgrade = async () => {
    setError(null);
    setPhase('running');
    try {
      await forceVersionUpgrade(dotYouClient);
    } catch (err) {
      // The upgrade can still be running server-side even if this request errors
      // (e.g. it was already in progress); polling resolves the real state.
      console.warn('forceVersionUpgrade request failed', err);
    }
    void refreshVersionInfo();
  };

  // Initial probe: figure out whether an upgrade is running, required, or done.
  const init = async () => {
    setPhase('checking');
    setError(null);
    try {
      const status = await getUpgradeStatus(dotYouClient);
      void refreshVersionInfo();

      // (1) An upgrade is already running -> just show the spinner and poll.
      if (status.upgradeRunning) {
        setPhase('running');
        return;
      }

      // (2) An upgrade is required -> trigger it, then poll.
      if (status.requiresUpgrade) {
        await beginUpgrade();
        return;
      }

      // Nothing to do; data is already up to date.
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to check for data updates'));
      setPhase('error');
    }
  };

  useEffect(() => {
    void init();
  }, []);

  // While an upgrade is running, poll the data version until it no longer requires an upgrade.
  useEffect(() => {
    if (phase !== 'running') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const info = await getDataVersionInfo(dotYouClient);
        if (cancelled) return;
        setVersionInfo(info);
        if (!info.requiresUpgrade) {
          setPhase('done');
          return;
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Failed to poll data version info', err);
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase]);

  const doReturn = () => {
    window.location.href = returnUrl ?? '/owner';
  };

  const isBusy = phase === 'checking' || phase === 'running';

  return (
    <>
      <Helmet>
        <title>{t('Data Upgrade')} | Homebase</title>
      </Helmet>

      <section className="flex min-h-screen flex-col justify-center md:min-h-0 md:py-20">
        <div className="container mx-auto p-5">
          <div className="mx-auto max-w-[35rem] dark:text-white">
            <h1 className="mb-5 text-center text-2xl">{t('Data Upgrade')}</h1>

            {isBusy ? (
              <div className="flex flex-col items-center gap-5 py-6 text-center">
                <Loader className="h-16 w-16 text-indigo-500" />
                <div>
                  <p className="text-lg dark:text-white">
                    {phase === 'checking'
                      ? t('Checking for data updates...')
                      : t('Upgrading your data, please wait...')}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {t('This can take a while. Please keep this page open.')}
                  </p>
                  {versionInfo ? <UpgradeProgress versionInfo={versionInfo} /> : null}
                </div>
              </div>
            ) : null}

            {phase === 'done' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-500" aria-hidden={true} />
                <p className="text-lg dark:text-white">{t('Your data is up to date')}</p>
                {returnUrl ? (
                  <p className="text-sm text-slate-400">{t('You can now return to the app.')}</p>
                ) : null}
              </div>
            ) : null}

            {phase === 'error' ? (
              <div className="py-4">
                <p className="text-red-600">
                  {error || t('Something went wrong while checking for data updates')}
                </p>
              </div>
            ) : null}

            {/* Buttons - always rendered above the details section */}
            {!isBusy ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
                {phase === 'done' ? (
                  <ActionButton type="primary" icon={Arrow} onClick={doReturn} autoFocus>
                    {returnUrl ? t('Return to App') : t('Continue to Homebase')}
                  </ActionButton>
                ) : null}

                {phase === 'error' ? (
                  <ActionButton type="primary" onClick={() => void init()}>
                    {t('Try again')}
                  </ActionButton>
                ) : null}
              </div>
            ) : null}

            {/* Data version details - collapsed by default, below the buttons */}
            <details className="group mt-8 rounded-lg border bg-white dark:border-slate-800 dark:bg-black">
              <summary className="flex cursor-pointer list-none flex-row items-center px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="mr-auto">{t('Data version details')}</span>
                <Chevron className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t px-4 py-4 dark:border-slate-800">
                {versionInfo ? (
                  <VersionInfoDetails versionInfo={versionInfo} />
                ) : (
                  <p className="text-slate-400">{t('Loading...')}</p>
                )}
              </div>
            </details>
          </div>
        </div>
      </section>
    </>
  );
};

// A compact status line shown alongside the spinner while an upgrade is running.
const UpgradeProgress = ({ versionInfo }: { versionInfo: VersionInfoResult }) => {
  return (
    <div className="mt-3 text-sm text-slate-400">
      <p>
        {t('Data version')} {versionInfo.actualDataVersionNumber} &rarr;{' '}
        {versionInfo.serverDataVersionNumber}
      </p>
      {versionInfo.failureCorrelationId ? (
        <p className="mt-1 text-red-600">
          {t('A previous attempt failed')} ({t('Correlation Id')}:{' '}
          {versionInfo.failureCorrelationId})
        </p>
      ) : null}
    </div>
  );
};

// The full data version dump, reused from the version info settings screen.
const VersionInfoDetails = ({ versionInfo }: { versionInfo: VersionInfoResult }) => {
  return (
    <>
      <div className="mb-2">
        <Label>{t('Server Data Version')}</Label>
        <p className="max-w-lg text-slate-400">{versionInfo.serverDataVersionNumber}</p>
      </div>

      <div className="mb-2">
        <Label>{t('Your Data Version')}</Label>
        <p className="flex max-w-lg items-center text-slate-400">
          {versionInfo.actualDataVersionNumber}
          {versionInfo.actualDataVersionNumber === versionInfo.serverDataVersionNumber && (
            <CheckCircle className="ml-2 h-5 w-5 text-green-500" aria-label={t('Versions match')} />
          )}
        </p>
      </div>

      <div className="mb-2">
        <Label>{t('Last Upgraded')}</Label>
        <p className="max-w-lg text-slate-400">
          <TimeAgoUtc value={versionInfo.lastUpgraded} showAbsolute={true} absoluteFormat="datetime" />
        </p>
      </div>

      {versionInfo.failedDataVersionNumber != null && (
        <div className="mb-2">
          <Label>{t('Failed Data Version')}</Label>
          <p className="max-w-lg text-slate-400">{versionInfo.failedDataVersionNumber}</p>
        </div>
      )}

      {versionInfo.lastAttempted != null && (
        <div className="mb-2">
          <Label>{t('Last Attempted')}</Label>
          <p className="max-w-lg text-slate-400">
            <TimeAgoUtc
              value={versionInfo.lastAttempted}
              showAbsolute={true}
              absoluteFormat="datetime"
            />
          </p>
        </div>
      )}

      {versionInfo.failedBuildVersion && (
        <div className="mb-2">
          <Label>{t('Failed Build Version')}</Label>
          <p className="max-w-lg text-slate-400">{versionInfo.failedBuildVersion}</p>
        </div>
      )}

      {versionInfo.failureCorrelationId && (
        <div className="mb-2">
          <Label>{t('Correlation Id')}</Label>
          <p className="max-w-lg text-slate-400">{versionInfo.failureCorrelationId}</p>
        </div>
      )}
    </>
  );
};

export default DataUpgrade;
