import { HybridLink, SubtleMessage, t } from '@youfoundation/common-app';
import useApps from '../../../hooks/apps/useApps';
import { Grid } from '@youfoundation/common-app';

import { LoadingBlock } from '@youfoundation/common-app';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import Section from '../../../components/ui/Sections/Section';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import Submenu from '../../../components/SubMenu/SubMenu';
import { RedactedAppRegistration } from '../../../provider/app/AppManagementProviderTypes';
import { CompanyImage } from '../../../components/Connection/CompanyImage/CompanyImage';

const Apps = () => {
  const { data: registeredApps, isLoading: loadingRegisteredApps } = useApps().fetchRegistered;

  return (
    <>
      <PageMeta icon={Grid} title={'Third party apps & services'} />

      <Submenu
        items={[
          {
            title: `Apps`,
            path: `/owner/third-parties/apps`,
          },
          {
            title: `Services`,
            path: `/owner/third-parties/services`,
          },
        ]}
        className="-mt-6 mb-6"
      />
      <p className="mb-6 max-w-2xl text-slate-400">
        Apps are third-parties that have authorized you with your Odin identity. And have direct
        access to the drives you have authorized them to. Keep in mind that they are running as if
        it was you when you are using the app. So be extra careful what you authorize.
      </p>

      {!registeredApps || registeredApps?.length === 0 ? (
        <SubtleMessage>{t('No apps currently registered')}</SubtleMessage>
      ) : (
        <Section>
          <div className="flex flex-col gap-1">
            {loadingRegisteredApps && (
              <>
                <LoadingBlock className="m-1 h-12" />
                <LoadingBlock className="m-1 h-12" />
              </>
            )}
            {registeredApps.map((app) => (
              <AppListItem app={app} key={app.appId} />
            ))}
          </div>
        </Section>
      )}

      <DiscoverApps />
    </>
  );
};

const AppListItem = ({ app, className }: { app: RedactedAppRegistration; className?: string }) => {
  return (
    <HybridLink
      href={`/owner/third-parties/apps/${encodeURIComponent(app.appId)}`}
      className="bg-transparent transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <div
        className={`group flex flex-row items-center gap-2 py-2 sm:gap-8 sm:px-2 ${
          className ?? ''
        }`}
      >
        <CompanyImage domain={app.corsHostName || app.name} className="w-12" fallbackSize="xs" />
        <h2 className="font-thiner dark:text-white">
          <span className="break-words">
            {`${app.isRevoked ? t('Revoked') : ''}`} {app.name}{' '}
            {app.corsHostName ? <>| {app.corsHostName}</> : null}
          </span>
          <small className="block text-sm text-slate-400">
            {t('first used')}:{' '}
            {new Date(app.created).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              weekday: 'short',
              hour: 'numeric',
              minute: 'numeric',
            })}
          </small>
        </h2>
      </div>
    </HybridLink>
  );
};

const DiscoverApps = () => {
  const { data: registeredApps, isLoading: registeredAppsLoading } = useApps().fetchRegistered;
  const potentialApps = [
    {
      name: 'Chatr',
      appId: '0babb1e6-7604-4bcd-b1fb-87e959226492',
      href: 'https://chat.odin.earth',
    },
    {
      name: 'Odin - Photos',
      appId: `32f0bdbf-017f-4fc0-8004-2d4631182d1e`,
      href: 'https://photos.odin.earth',
    },
  ];

  const availableApps = potentialApps.filter(
    (potential) =>
      !registeredApps?.some((registered) => stringGuidsEqual(registered.appId, potential.appId))
  );

  if (!availableApps.length || registeredAppsLoading) return null;

  return (
    <>
      <Section
        title={
          <>
            {t('Discover other apps')}
            <small className="block text-sm text-slate-400">
              {t(
                'Secure your data even further, keep it all safe on your own personal and private identity'
              )}
              :
            </small>
          </>
        }
        className="mt-20"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {availableApps.map((app) => (
            <CardLink href={app.href} title={app.name} key={app.appId} icon={Grid} />
          ))}
        </div>
      </Section>
    </>
  );
};

export default Apps;
