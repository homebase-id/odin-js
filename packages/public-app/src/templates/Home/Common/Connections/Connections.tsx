import { useEffect, useState } from 'react';
import {
  LoadingBlock,
  SubtleMessage,
  t,
  useActiveConnections,
  useFollowingInfinite,
} from '@homebase-id/common-app';

import { Pager, IdentityTeaser } from '@homebase-id/common-app';

const Connections = ({ className }: { className?: string }) => {
  return (
    <div className={`${className ?? ''} grid grid-flow-row gap-8`}>
      <ConnectionSection />
      <FollowingSection />
    </div>
  );
};

const PAGE_SIZE = 30;
const ConnectionSection = ({ className }: { className?: string }) => {
  const [activePage, setActivePage] = useState(1);
  const {
    data: connections,
    isFetched: connectionsFetched,
    isLoading: connectionsLoading,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useActiveConnections({
    pageSize: PAGE_SIZE,
  }).fetch;

  useEffect(() => {
    if (!isFetchedAfterMount) return;

    if (connections?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [activePage, isFetchedAfterMount]);

  const hasNextPage = connections?.pages[activePage] || hasNextPageOnServer;

  if (connectionsFetched && (!connections?.pages.length || !connections.pages[0].results.length))
    return <SubtleMessage>{t('No connections')}</SubtleMessage>;

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
      <div className="py-2">
        {connectionsFetched &&
        connections?.pages?.length &&
        connections?.pages[activePage - 1]?.results?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connections?.pages[activePage - 1].results.map((item, index) => (
              <IdentityTeaser key={index} odinId={item?.odinId} className="p-2" />
            ))}
          </div>
        ) : connectionsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(Array(PAGE_SIZE)).map((_val, index) => (
              <LoadingBlock key={index} className="h-24 w-full" />
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
    isFetched: identitiesFetched,
    isLoading: identitiesLoading,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useFollowingInfinite().fetch;

  const flattenedIdentities = identitiesIFollow?.pages.flatMap((page) => page?.results);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isFetchedAfterMount) return;

    if (identitiesIFollow?.pages[currentPage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [currentPage, isFetchedAfterMount]);

  const hasNextPage = identitiesIFollow?.pages[currentPage] || hasNextPageOnServer;

  if (
    identitiesFetched &&
    (!identitiesIFollow?.pages.length || !identitiesIFollow.pages[0].results.length)
  )
    return null;

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
      <div className="py-2">
        {flattenedIdentities?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flattenedIdentities.map((item, index) => {
              if (!item) return null;
              return <IdentityTeaser key={index} odinId={item} className="p-2" />;
            })}
          </div>
        ) : identitiesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(Array(PAGE_SIZE)).map((_val, index) => (
              <LoadingBlock key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Connections;
