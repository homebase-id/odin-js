import { ContactFile, getContacts } from '@homebase-id/js-lib/network';
import { useQuery } from '@tanstack/react-query';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useOdinClientContext } from '../auth/useOdinClientContext';

const CHUNKSIZE = 200;
export const useAllContacts = (enabled: boolean) => {
  const odinClient = useOdinClientContext();

  const fetchMentionTargets = async () => {
    // self invoking function that fetches the contacts in blocks of a CHUNKSIZE untill there are no more contacts to fetch
    const internalGetContacts = async (
      cursor: string | undefined,
      limit: number
    ): Promise<HomebaseFile<ContactFile>[]> => {
      const contacts = await getContacts(odinClient, cursor, limit);
      if (contacts?.cursorState && contacts.results.length >= limit) {
        const nextContacts = await internalGetContacts(contacts.cursorState, limit);
        return contacts.results.concat(nextContacts);
      }
      return contacts.results;
    };

    return internalGetContacts(undefined, CHUNKSIZE);
  };

  return useQuery({
    queryKey: ['mention-targets'],
    queryFn: fetchMentionTargets,
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
};
