import { HybridLink, LoadingBlock, PageMeta, SubtleMessage, t } from '@homebase-id/common-app';
import { Grid } from '@homebase-id/common-app/icons';
import { AppRegistrationV2 } from '@homebase-id/js-lib/auth';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import Section from '../../components/ui/Sections/Section';
import { useAppRegistrationsV2 } from '../../hooks/appsV2/useAppRegistrationsV2';
import { useBundleTokens } from '../../hooks/appsV2/useBundleTokens';
import { Badge, V2ErrorAlert } from '../../components/AppsV2/AppsV2Parts';

/** `/owner/apps-v2`: every registration as V2 sees it, with what each app owns. */
const AppsV2 = () => {
  const { data: registrations, isLoading, error } = useAppRegistrationsV2().fetch;
  const { data: tokens } = useBundleTokens().fetch;

  const tokenCount = (appId: string) =>
    (tokens ?? []).filter((token) => token.apps.some((app) => stringGuidsEqual(app.appId, appId))).length;

  const sorted = [...(registrations ?? [])].sort(
    (a, b) =>
      Number(a.registration.isRevoked) - Number(b.registration.isRevoked) ||
      Number(a.isReserved) - Number(b.isReserved) ||
      a.registration.name.localeCompare(b.registration.name)
  );

  return (
    <>
      <PageMeta
        icon={Grid}
        title={t('Apps (V2)')}
        breadCrumbs={[{ href: '/owner/third-parties/apps', title: t('Third party apps') }, { title: t('Apps (V2)') }]}
        actions={
          <HybridLink href="/owner/bundle-tokens" className="my-auto text-sm hover:underline">
            {t('Bundle tokens')}
          </HybridLink>
        }
      />
      <p className="mb-6 max-w-2xl text-slate-400">
        {t(
          'Registered apps with the drives and circles they own. Built-in apps are managed by your identity and cannot be changed here.'
        )}
      </p>

      <V2ErrorAlert error={error} title={t('Could not load apps')} />

      {isLoading ? (
        <>
          <LoadingBlock className="m-1 h-12" />
          <LoadingBlock className="m-1 h-12" />
        </>
      ) : !sorted.length ? (
        <SubtleMessage>{t('No apps currently registered')}</SubtleMessage>
      ) : (
        <Section>
          <div className="flex flex-col gap-1">
            {sorted.map((app) => (
              <AppV2ListItem app={app} tokenCount={tokenCount(app.registration.appId)} key={app.registration.appId} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
};

const AppV2ListItem = ({ app, tokenCount }: { app: AppRegistrationV2; tokenCount: number }) => {
  const reg = app.registration;
  return (
    <HybridLink
      href={`/owner/apps-v2/${encodeURIComponent(reg.appId)}`}
      className="bg-transparent transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <div className={`flex flex-col gap-1 py-2 sm:px-2 ${reg.isRevoked ? 'opacity-60' : ''}`}>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <span className="dark:text-white">{reg.name}</span>
          {app.isReserved ? <Badge>{t('Built-in')}</Badge> : null}
          {reg.isRevoked ? <Badge tone="critical">{t('Revoked')}</Badge> : null}
          {reg.corsHostName ? <span className="text-sm text-slate-400">{reg.corsHostName}</span> : null}
        </div>
        <small className="flex flex-row flex-wrap gap-x-4 text-slate-400">
          {reg.appSlug ? <span className="font-mono">{reg.appSlug}</span> : null}
          <span>
            {app.ownedDrives.length} {t('owned drives')}
          </span>
          <span>
            {app.ownedCircles.length} {t('owned circles')}
          </span>
          <span>
            {tokenCount} {t('bundle tokens')}
          </span>
        </small>
      </div>
    </HybridLink>
  );
};

export default AppsV2;
