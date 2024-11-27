import { PageMeta } from '@homebase-id/common-app';
import Submenu from '../../../components/SubMenu/SubMenu';
import { useState, useEffect } from 'react';
import Section from '../../../components/ui/Sections/Section';
import { DomainMembership, useDomain } from '@homebase-id/common-app';
import { CompanyImage } from '../../../components/Connection/CompanyImage/CompanyImage';
import {
  useDomains,
  SubtleMessage,
  t,
  Pager,
  LoadingBlock,
  ErrorNotification,
  HybridLink,
  ActionButton,
} from '@homebase-id/common-app';
import { Grid, Shield, Eye, Times } from '@homebase-id/common-app/icons';
import { useManageDomain } from '../../../hooks/connections/useManageDomain';

const Domains = () => {
  const [activePage, setActivePage] = useState(1);

  const {
    data: activeDomains,
    isLoading: activeDomainsLoading,
    isFetchedAfterMount: activeDomainsFetchedAfterMount,
    hasNextPage: activeHasNextPageOnServer,
    fetchNextPage: fetchNextActivePage,
  } = useDomains().fetch;

  useEffect(() => {
    if (!activeDomainsFetchedAfterMount) {
      return;
    }

    if (activeDomains?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextActivePage();
    }
  }, [activePage, activeDomainsFetchedAfterMount]);

  const activeHasNextPage = activeDomains?.pages[activePage] || activeHasNextPageOnServer;

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
        className="mb-6"
      />
      <p className="mb-6 max-w-2xl text-slate-400">
        Services are third-parties that have authorized you with your Homebase identity. By default
        they are only given access to your publicly available data. However, they can also be a
        member of one or more circles and receive extra access that way.
      </p>

      {activeDomains?.pages?.[activePage - 1]?.results?.length === 0 ? (
        <SubtleMessage className="flex flex-row items-center">
          <span>{t('There are no third-parties with access to your identity')}</span>
        </SubtleMessage>
      ) : (
        <>
          <Pager
            totalPages={activeHasNextPage ? activePage + 1 : activePage}
            setPage={setActivePage}
            currentPage={activePage}
          />

          <Section>
            <div className="flex flex-col gap-4 sm:gap-1">
              {activeDomainsLoading && (
                <>
                  <LoadingBlock className="m-1 h-12" />
                  <LoadingBlock className="m-1 h-12" />
                </>
              )}
              {activeDomains?.pages?.[activePage - 1]?.results?.map((domain) => (
                <DomainListItem domain={domain} key={domain.domain} />
              ))}
            </div>
          </Section>
        </>
      )}
    </>
  );
};

const DomainListItem = ({
  domain,
  className,
}: {
  domain: DomainMembership;
  className?: string;
}) => {
  const {
    fetch: { data: fullDomainInfo },
  } = useDomain({ domain: domain.domain });
  const {
    disconnect: { mutate: disconnect, status: disconnectStatus, error: actionError },
  } = useManageDomain();

  const hasExtendedPermissions =
    fullDomainInfo?.circleGrants?.length && fullDomainInfo?.circleGrants?.length > 0;

  return (
    <>
      <ErrorNotification error={actionError} />
      <HybridLink
        href={(domain.domain && `/owner/third-parties/services/${domain.domain}`) ?? undefined}
        className="bg-transparent transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <div
          className={`group flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:gap-8 sm:px-2 ${
            className ?? ''
          }`}
        >
          <div className="flex flex-row gap-2 sm:contents">
            <CompanyImage domain={domain.domain} className="w-12" fallbackSize="xs" />

            <h2 className="font-thiner dark:text-white">
              <span className="break-words">{domain.domain}</span>
              <small className="block text-sm text-slate-400">
                {t('First used')}:{' '}
                {new Date(domain.modified).toLocaleString(undefined, {
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
          <div className="ml-auto flex flex-row items-center text-sm text-slate-400 sm:mx-auto">
            {hasExtendedPermissions ? (
              <>
                <Shield className="mr-2 h-5 w-5" />
                <p className="flex flex-col">
                  <span>{t('Private access')}</span>
                  <small className="block leading-none">
                    {t('Member of')} {fullDomainInfo.circleGrants.length}{' '}
                    {fullDomainInfo.circleGrants.length === 1 ? t('circle') : t('circles')}
                  </small>
                </p>
              </>
            ) : (
              <>
                <Eye className="mr-2 h-5 w-5" /> <p>{t('Public access')}</p>
              </>
            )}
          </div>
          <ActionButton
            type="secondary"
            className="ml-auto hidden opacity-0 transition-opacity group-hover:opacity-100 md:block"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              disconnect({ domain: domain.domain });
              return false;
            }}
            state={disconnectStatus}
            confirmOptions={{
              type: 'critical',
              title: `${t('Remove')} ${domain.domain}`,
              buttonText: t('Remove'),
              body: `${t('Are you sure you want to remove')} ${domain.domain} ${t(
                'from your connections. They will lose all existing access.'
              )}`,
            }}
            icon={Times}
            size="square"
          />
        </div>
      </HybridLink>
    </>
  );
};

export default Domains;
