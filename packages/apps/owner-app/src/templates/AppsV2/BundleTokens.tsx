import { useSearchParams } from 'react-router-dom';
import { HybridLink, LoadingBlock, PageMeta, t } from '@homebase-id/common-app';
import { Grid } from '@homebase-id/common-app/icons';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import Section from '../../components/ui/Sections/Section';
import { useBundleTokens } from '../../hooks/appsV2/useBundleTokens';
import { useAppRegistrationsV2 } from '../../hooks/appsV2/useAppRegistrationsV2';
import { BundleTokenList, V2ErrorAlert } from '../../components/AppsV2/AppsV2Parts';

/** `/owner/bundle-tokens?appId=`: every bundle token, or only those reaching one app. */
const BundleTokens = () => {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('appId') || undefined;
  const { data: tokens, isLoading, error } = useBundleTokens({ appId }).fetch;
  const { data: registrations } = useAppRegistrationsV2().fetch;

  const appName = appId
    ? registrations?.find((r) => stringGuidsEqual(r.registration.appId, appId))?.registration.name ?? appId
    : undefined;

  return (
    <>
      <PageMeta
        icon={Grid}
        title={appName ? `${t('Bundle tokens for')} ${appName}` : t('Bundle tokens')}
        breadCrumbs={[
          { href: '/owner/apps-v2', title: t('Apps (V2)') },
          ...(appId ? [{ href: '/owner/bundle-tokens', title: t('Bundle tokens') }] : []),
          { title: appName ?? t('Bundle tokens') },
        ]}
      />
      <p className="mb-6 max-w-2xl text-slate-400">
        {t(
          'A bundle token is one sign-in that works as several of your apps. Revoking it cuts off every app in it on the next request; removing an app only cuts off that app.'
        )}
        {appId ? (
          <>
            {' '}
            <HybridLink href="/owner/bundle-tokens" className="hover:underline">
              {t('Show all tokens')}
            </HybridLink>
          </>
        ) : null}
      </p>

      <V2ErrorAlert error={error} title={t('Could not load bundle tokens')} />

      {isLoading ? (
        <>
          <LoadingBlock className="m-1 h-16" />
          <LoadingBlock className="m-1 h-16" />
        </>
      ) : (
        <Section title={`${t('Tokens')} (${tokens?.length ?? 0})`}>
          <BundleTokenList tokens={tokens} highlightAppId={appId} />
        </Section>
      )}
    </>
  );
};

export default BundleTokens;
