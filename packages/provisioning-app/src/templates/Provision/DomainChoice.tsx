import { Link } from 'react-router-dom';
import { t } from '../../helpers/i18n/dictionary';
import { ROOT_PATH } from '../../app/App';
import { Arrow } from '@homebase-id/common-app/icons';
import { useFetchManagedDomainsApexes } from '../../hooks/managedDomain/useManagedDomain';

const DomainChoice = () => {
  const {
    fetchManagedDomainApexes: { data: managedDomainApexes },
  } = useFetchManagedDomainsApexes();

  return (
    <section className="flex flex-grow flex-col">
      <div className="container mx-auto flex h-full min-h-full flex-grow flex-col px-5">
        <div className="mt-20 min-h-[20rem]">
          <h1 className="mb-10 text-4xl">
            Homebase | Signup
            <span className="mt-1 block text-3xl text-slate-400">{t('Create a new identity')}</span>
          </h1>
          <p className="mb-4">{t('How do you want to proceed?')}</p>
          <div className="-m-4 flex w-full flex-col md:flex-row">
            {managedDomainApexes?.length && managedDomainApexes.length > 0 ? (
              <div className="min-h-full cursor-pointer p-4 md:w-1/2">
                <Link
                  to={`${ROOT_PATH}/managed-domain${window.location.search}`}
                  className="min-h-full"
                >
                  <div className="flex min-h-full flex-col rounded-lg border bg-slate-50 p-4 hover:shadow-md">
                    <h2 className="mb-2 text-lg">{t('Managed Domain')}</h2>
                    <p className="font-light text-slate-400">
                      {t(
                        "Don't have your own domain? We can provide you with one to get you going. You can change this later."
                      )}
                    </p>
                    <div className="mt-auto flex flex-row justify-end">
                      <Arrow className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              </div>
            ) : null}
            <div className="min-h-full cursor-pointer p-4 md:w-1/2">
              <Link to={`${ROOT_PATH}/own-domain${window.location.search}`} className="min-h-full">
                <div className="flex min-h-full flex-col rounded-lg border bg-slate-50 p-4 hover:shadow-md">
                  <h2 className="mb-2 text-lg">{t('Use your own domain')}</h2>
                  <p className="font-light text-slate-400">
                    {t(
                      'Do you own your own domain name, and are able to change the DNS records to point to your new identity server?'
                    )}
                  </p>
                  <div className="mt-auto flex flex-row justify-end">
                    <Arrow className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DomainChoice;
