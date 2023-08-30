import {
  ActionButton,
  ErrorNotification,
  Globe,
  Grid,
  HybridLink,
  LoadingBlock,
  Pager,
  SubtleMessage,
  Times,
  t,
  useDomains,
} from '@youfoundation/common-app';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import Submenu from '../../../components/SubMenu/SubMenu';
import { useState, useEffect } from 'react';
import Section, { SectionTitle } from '../../../components/ui/Sections/Section';
import DomainCard from '../../../components/Connection/DomainCard/DomainCard';
import useDomain from '../../../hooks/connections/useDomain';
import { DomainMembership } from '../../../provider/network/domainNetwork/DomainProvider';
import { CompanyImage } from '../../../components/Connection/CompanyImage/CompanyImage';

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
        className="-mt-6 mb-6"
      />
      <p className="max-w-2xl text-slate-400">
        Services are third-parties that have authorized you with your Odin identity. By default they
        are only given access to your publicly available data. However, they can also be a member of
        one or more circles and receive extra access that way.
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
            <div className="flex flex-col gap-1">
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
    mutate: disconnect,
    status: disconnectStatus,
    error: actionError,
  } = useDomain({}).disconnect;

  return (
    <>
      <ErrorNotification error={actionError} />
      <HybridLink
        href={(domain.domain && `/owner/third-parties/services/${domain.domain}`) ?? undefined}
        className="bg-transparent transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <div className={`group flex flex-row items-center gap-8 p-2 ${className ?? ''}`}>
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

          <ActionButton
            type="secondary"
            className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
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
