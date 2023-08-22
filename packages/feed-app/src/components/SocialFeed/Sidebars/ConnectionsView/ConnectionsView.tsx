import { useEffect, useState } from 'react';
import {
  IdentityTeaser,
  t,
  useActiveConnections,
  LoadingBlock,
  Pager,
} from '@youfoundation/common-app';

const ConnectionsView = ({ className }: { className?: string }) => {
  const [activePage, setActivePage] = useState(1);

  const {
    data: connections,
    isFetched: connectionsFetched,
    isLoading: isConnectionsLoading,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useActiveConnections({
    pageSize: 5,
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

  if (connectionsFetched && (!connections?.pages.length || !connections.pages[0]?.results.length))
    return null;

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <div className="flex flex-row flex-wrap items-center">
        <h2 className="text-foreground">{t('Connections')}</h2>
        <Pager
          totalPages={hasNextPage ? activePage + 1 : activePage}
          setPage={setActivePage}
          currentPage={activePage}
          className="ml-auto"
        />
      </div>
      {isConnectionsLoading ? (
        <>
          <LoadingBlock className="my-1 h-12 w-full" />
          <LoadingBlock className="my-1 h-12 w-full" />
          <LoadingBlock className="my-1 h-12 w-full" />
        </>
      ) : null}
      {connectionsFetched &&
      connections?.pages?.length &&
      connections.pages[activePage - 1]?.results.length
        ? connections.pages[activePage - 1].results.map((item, index) => {
            return (
              <IdentityTeaser
                key={index}
                odinId={item?.odinId}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                size="sm"
                isBorderLess={true}
              />
            );
          })
        : null}
    </div>
  );
};

export default ConnectionsView;
