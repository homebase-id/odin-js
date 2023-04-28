import { useEffect, useState } from 'react';
import { t } from '../../../../helpers/i18n/dictionary';
import useConnections from '../../../../hooks/connections/useConnections';
import useFollowingInfinite from '../../../../hooks/follow/useFollowing';
import ConnectionTeaser from './ConnectionTeaser';
import { Pager } from '@youfoundation/common-app';

const Connections = ({ className }: { className?: string }) => {
  return (
    <div className={`${className ?? ''} grid grid-flow-row gap-8`}>
      <ConnectionSection />
      <FollowingSection />
    </div>
  );
};

const ConnectionSection = ({ className }: { className?: string }) => {
  const [activePage, setActivePage] = useState(1);
  const {
    data: connections,
    isFetched: connectionsFetched,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useConnections({
    pageSize: 10,
  }).fetch;

  useEffect(() => {
    if (!isFetchedAfterMount) {
      return;
    }

    if (connections?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [activePage, isFetchedAfterMount]);

  const hasNextPage = connections?.pages[activePage] || hasNextPageOnServer;

  if (connectionsFetched && !connections?.pages.length) {
    return null;
  }

  return (
    <div className={className ?? ''}>
      <div className="mb-4 flex flex-row">
        <h2 className="text-xl">{t('Connections')}</h2>
        <Pager
          totalPages={hasNextPage ? activePage + 1 : activePage}
          setPage={setActivePage}
          currentPage={activePage}
          className="ml-auto"
        />
      </div>
      <div className="px-2 py-2">
        {connectionsFetched &&
        connections?.pages?.length &&
        connections?.pages[activePage - 1]?.results?.length ? (
          <div className="grid grid-cols-3 gap-3">
            {connections?.pages[activePage - 1].results.map((item, index) => (
              <ConnectionTeaser key={index} odinId={item?.odinId} className="p-2" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FollowingSection = ({ className }: { className?: string }) => {
  const {
    data: identitiesIFollow,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useFollowingInfinite({
    pageSize: 15,
  }).fetch;
  // const totalPages = connections?.totalPages;

  const flattenedIdentities = identitiesIFollow?.pages.flatMap((page) => page?.results);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isFetchedAfterMount) {
      return;
    }

    if (identitiesIFollow?.pages[currentPage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [currentPage, isFetchedAfterMount]);

  const hasNextPage = identitiesIFollow?.pages[currentPage] || hasNextPageOnServer;

  return (
    <div className={className ?? ''}>
      <div className="mb-4 flex flex-row">
        <h2 className="text-xl">{t('Following')}</h2>
        <Pager
          currentPage={currentPage}
          setPage={setCurrentPage}
          totalPages={hasNextPage ? currentPage + 1 : currentPage}
          className="ml-auto"
        />
      </div>
      <div className="px-2 py-2">
        {flattenedIdentities?.length ? (
          <div className="grid grid-cols-3 gap-3">
            {flattenedIdentities.map((item, index) => {
              if (!item) {
                return null;
              }
              return <ConnectionTeaser key={index} odinId={item} className="p-2" />;
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Connections;
