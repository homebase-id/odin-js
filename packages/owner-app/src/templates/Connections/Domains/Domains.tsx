import {
  ActionButton,
  ErrorNotification,
  Globe,
  LoadingBlock,
  Pager,
  Times,
  t,
  useDomains,
} from '@youfoundation/common-app';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import Submenu from '../../../components/SubMenu/SubMenu';
import { useState, useEffect } from 'react';
import { SectionTitle } from '../../../components/ui/Sections/Section';
import DomainCard from '../../../components/Connection/DomainCard/DomainCard';
import useDomain from '../../../hooks/connections/useDomain';
import { DomainMembership } from '../../../provider/network/domainNetwork/DomainProvider';

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
      <PageMeta icon={Globe} title={'Third-Parties'} />

      <Submenu
        items={[
          {
            title: `Connections`,
            path: `/owner/connections`,
          },
          {
            title: `Third-Parties`,
            path: `/owner/third-parties`,
          },
        ]}
        className="-mt-6 mb-6"
      />

      <SectionTitle
        title={t('Third-Parties')}
        actions={
          <Pager
            totalPages={activeHasNextPage ? activePage + 1 : activePage}
            setPage={setActivePage}
            currentPage={activePage}
          />
        }
      />
      <div className="-m-1 mt-5 flex flex-row flex-wrap">
        {activeDomainsLoading && (
          <>
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
            <LoadingBlock className="m-1 aspect-square w-1/2 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6" />
          </>
        )}

        {activeDomains?.pages?.[activePage - 1]?.results?.map((domain) => (
          <DomainActive
            className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/6"
            domain={domain}
            key={domain.domain}
          />
        ))}
      </div>
    </>
  );
};

const DomainActive = ({ domain, className }: { domain: DomainMembership; className: string }) => {
  const {
    mutate: disconnect,
    status: disconnectStatus,
    error: actionError,
  } = useDomain({}).disconnect;

  return (
    <>
      <ErrorNotification error={actionError} />
      <DomainCard
        className={`${className ?? ''} relative`}
        domain={domain.domain}
        href={(domain.domain && `/owner/third-parties/${domain.domain}`) ?? undefined}
      >
        <div className="absolute right-2 top-2 z-10 aspect-square rounded-full">
          <ActionButton
            type="secondary"
            className="rounded-full"
            onClick={(e) => {
              e.preventDefault();
              disconnect({ domain: domain.domain });
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
      </DomainCard>
    </>
  );
};

export default Domains;
