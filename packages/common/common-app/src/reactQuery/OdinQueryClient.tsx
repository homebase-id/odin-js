import { QueryClient } from '@tanstack/react-query';
import {
  PersistQueryClientOptions,
  PersistQueryClientProvider,
  removeOldestQuery,
} from '@tanstack/react-query-persist-client';
import { ReactNode, useMemo } from 'react';
import { createIDBPersister } from './createIdbPersister';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Alert } from '../ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const DEFAULT_QUERY_KEYS = [
  'external-profile',
  'connection-info',
  'contact',
  'image',
  'push-notifications',
  'site-data',
];

export const OdinQueryClient = ({
  children,
  cacheKey,
  cachedQueryKeys,
  type,
}: {
  children: ReactNode;
  cacheKey: string;
  cachedQueryKeys: string[];
  type: 'local' | 'indexeddb';
}) => {
  if (!cacheKey || !cachedQueryKeys || !type) {
    return (
      <Alert type="critical">[OdinQueryClient] Missing required props for OdinQueryClient</Alert>
    );
  }

  const allCachedQueryKeys = useMemo(() => {
    if (cachedQueryKeys.some((key) => DEFAULT_QUERY_KEYS.includes(key))) {
      console.warn(
        `[OdinQueryClient] cachedQueryKeys contains default query keys: ${cachedQueryKeys.filter((key) => DEFAULT_QUERY_KEYS.includes(key)).join(', ')}`
      );
    }
    return [...DEFAULT_QUERY_KEYS, ...cachedQueryKeys];
  }, [cachedQueryKeys]);

  const persistOptions = useMemo(() => {
    const persister =
      type === 'indexeddb'
        ? createIDBPersister(cacheKey)
        : createSyncStoragePersister({
            storage: window.localStorage,
            retry: removeOldestQuery,
            key: cacheKey,
          });

    const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
      buster: '20241009',
      maxAge: Infinity,
      persister: persister,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          if (
            query.state.status === 'pending' ||
            query.state.status === 'error' ||
            (query.state.data &&
              typeof query.state.data === 'object' &&
              !Array.isArray(query.state.data) &&
              Object.keys(query.state.data).length === 0)
          )
            return false;
          const { queryKey } = query;
          return allCachedQueryKeys.some((key) => queryKey.includes(key));
        },
      },
    };

    return persistOptions;
  }, [cacheKey, allCachedQueryKeys]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
};
