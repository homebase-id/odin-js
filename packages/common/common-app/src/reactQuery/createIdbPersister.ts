import { get, set, del } from 'idb-keyval';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { debounce } from 'lodash-es';

/**
 * Creates an Indexed DB persister
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 */
// Persiter built like recommended by React Query: https://tanstack.com/query/v4/docs/framework/react/plugins/persistQueryClient#building-a-persister
// But got issues around persiting a lot, especially on Firefox https://github.com/TanStack/query/issues/5854; So we use this throttle fix: https://github.com/TanStack/query/issues/5854#issuecomment-1675968101

// Other options:
// Can't use the experimental CreatePersister https://github.com/TanStack/query/issues/6310
// Optional extension at some point: https://github.com/epicweb-dev/cachified
export function createIDBPersister(idbValidKey: IDBValidKey) {
  return {
    persistClient: debounce(async (client: PersistedClient) => {
      await set(idbValidKey, client);
    }, 100),
    restoreClient: async () => {
      return await get<PersistedClient>(idbValidKey);
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  } as Persister;
}
