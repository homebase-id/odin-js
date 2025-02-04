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
      gcTime: Infinity,
    },
  },
});

const DEFAULT_QUERY_KEYS = [
  'external-profile',
  'connection-info',
  'contact',
  'push-notifications',
  'site-data',
  'profiles',
  'payload-content',
];

const APP_QUERY_KEYS = [
  ...DEFAULT_QUERY_KEYS,
  // Chat:
  'chat-message',
  'chat-messages',
  'chat-reaction',
  'conversations',
  'conversations-with-recent-message',
  'process-chat-inbox',

  // Feed:
  'raw-image',
  'social-feeds',
  'collaborative-channels',
  'followers',
  'following',
  'channels',
  'channel',
  'process-feed-inbox',

  // Mail:
  'mail-conversations',
  'mail-settings',
  'process-mail-inbox',

  // Community:
  'process-community-inbox',
  'communities',
  'community',
  'community-metadata',
  'community-channels',
  'community-messages',
  'channels-with-recent-message',
  'community-status',
];

const PUBLIC_QUERY_KEYS: string[] = [...DEFAULT_QUERY_KEYS];

const OWNER_QUERY_KEYS: string[] = [
  ...DEFAULT_QUERY_KEYS,

  'detailed-connection-info',
  'process-owner-inbox',
  'social-feeds',
  'drives',
  'circles',
];

export const OdinQueryClient = ({
  children,
  app,
  type,
}: {
  children: ReactNode;
  app: 'app' | 'owner' | 'public';
  type: 'local' | 'indexeddb';
}) => {
  if (import.meta.env.MODE !== 'production' && (!app || !type)) {
    return (
      <Alert type="critical">[OdinQueryClient] Missing required props for OdinQueryClient</Alert>
    );
  }
  const cacheKey = `${app.toUpperCase()}_REACT_QUERY_OFFLINE_CACHE`;
  const cachedQueryKeys =
    app === 'app' ? APP_QUERY_KEYS : app === 'public' ? PUBLIC_QUERY_KEYS : OWNER_QUERY_KEYS;

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
      buster: '202501',
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
          return cachedQueryKeys.some((key) => queryKey.includes(key));
        },
        serializeData: (data) => {
          // Keep the serialized data small by only including the first two pages of data for infinite queries
          if (data?.pages?.length && data?.pages?.length > 2) {
            const adjustedData = { ...data };
            adjustedData.pages = adjustedData.pages.slice(0, 2);
            adjustedData.pageParams = adjustedData.pageParams.slice(0, 2);
            return adjustedData;
          }

          return data;
        },
      },
    };

    return persistOptions;
  }, [cacheKey, cachedQueryKeys]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
};
