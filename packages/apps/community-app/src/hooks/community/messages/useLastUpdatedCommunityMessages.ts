import { formatGuidId } from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export const useLastUpdatedCommunityMessages = ({
  communityId,
}: {
  communityId: string | undefined;
}) => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    const lastUpdates = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['community-messages', formatGuidId(communityId)], exact: false })
      .map((query) => query.state.dataUpdatedAt);

    setLastUpdate(lastUpdates.reduce((acc, val) => (val > acc ? val : acc), 0));
  }, []);

  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    const unsubscribe = queryCache.subscribe((e) => {
      if (e.type === 'added' || e.type === 'updated' || e.type === 'removed')
        if (e.query.queryKey[0] === 'community-messages') {
          const newUpdate = e.query.state.dataUpdatedAt;
          if (!newUpdate || (lastUpdate && newUpdate <= lastUpdate)) return;
          setLastUpdate(newUpdate);
        }
    });

    return () => unsubscribe();
  }, [queryClient]);

  return lastUpdate;
};
