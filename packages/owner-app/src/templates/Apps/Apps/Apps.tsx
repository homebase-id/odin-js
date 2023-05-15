import { t } from '@youfoundation/common-app';
import useApps from '../../../hooks/apps/useApps';
import { Grid } from '@youfoundation/common-app';
import { PageMeta } from '@youfoundation/common-app';
import { LoadingParagraph } from '@youfoundation/common-app';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { stringGuidsEqual } from '@youfoundation/js-lib';
import Section, { SectionTitle } from '../../../components/ui/Sections/Section';
import { Arrow } from '@youfoundation/common-app';

const Apps = () => {
  const { data: registeredApps, isLoading: loadingRegisteredApps } = useApps().fetchRegistered;

  return (
    <>
      <section>
        <PageMeta icon={Grid} title={'Apps'} />
      </section>
      <SectionTitle title={t('Registered Apps')} />
      <div className="mt-8">
        {loadingRegisteredApps ? (
          <>
            <LoadingParagraph className="m-4 h-10" />
            <LoadingParagraph className="m-4 h-10" />
            <LoadingParagraph className="m-4 h-10" />
          </>
        ) : (
          <>
            {registeredApps?.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {registeredApps.map((app) => (
                  <CardLink
                    href={`/owner/apps/${encodeURIComponent(app.appId)}`}
                    isDisabled={app.isRevoked}
                    title={
                      <>
                        {`${app.isRevoked ? t('Revoked') : ''} ${app.name}`}{' '}
                        <small className="block text-sm">{app.corsHostName}</small>
                      </>
                    }
                    description={`${t('Added on')}: ${new Date(app.created).toLocaleDateString()}`}
                    key={app.appId}
                  />
                ))}
              </div>
            ) : (
              <>{t('No apps currently registered')}</>
            )}
          </>
        )}
      </div>
      <DiscoverApps />
    </>
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
            <CardLink href={app.href} title={app.name} key={app.appId} icon={Arrow} />
          ))}
        </div>
      </Section>
    </>
  );
};

export default Apps;
