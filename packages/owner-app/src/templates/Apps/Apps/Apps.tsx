import { t } from '../../../helpers/i18n/dictionary';
import useApps from '../../../hooks/apps/useApps';
import Grid from '../../../components/ui/Icons/Grid/Grid';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';
import LoadingParagraph from '../../../components/ui/Loaders/LoadingParagraph/LoadingParagraph';
import CardLink from '../../../components/ui/Buttons/CardLink';

const Apps = () => {
  const { data: registeredApps, isLoading: loadingRegisteredApps } = useApps().fetchRegistered;

  return (
    <>
      <section>
        <PageMeta icon={Grid} title={'Apps'} />
      </section>
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
    </>
  );
};

export default Apps;
