import {
  experimental_createPersister,
  type AsyncStorage,
  type PersistedQuery,
} from '@tanstack/query-persist-client-core';

import { get, set, del } from 'idb-keyval';

const newIdbStorage = (): AsyncStorage<PersistedQuery> => {
  return {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  };
};

export const createExperimentalPersiter = () =>
  experimental_createPersister<PersistedQuery>({
    storage: newIdbStorage(),
    maxAge: 1000 * 60 * 60 * 12, // 12 hours,
    serialize: (persistedQuery) => persistedQuery,
    deserialize: (cached) => cached,
    filters: {
      queryKey: ['mail-conversations'],
      exact: true,
    },
  });
