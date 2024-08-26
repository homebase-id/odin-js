import { useInfiniteQuery } from '@tanstack/react-query';
import { CursoredResult, NewHomebaseFile } from '@homebase-id/js-lib/core';

import { useAuth } from '../auth/useAuth';
import { parseContact } from './useContact';
import { RawContact, getContacts } from '@homebase-id/js-lib/network';

const pageSize = 10;

export const useContacts = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetch = async (
    cursorState?: string
  ): Promise<CursoredResult<NewHomebaseFile<RawContact>[]>> => {
    const data = await await getContacts(dotYouClient, cursorState, pageSize);
    return { ...data, results: data.results.map((contact) => parseContact(contact)) };
  };

  return {
    fetch: useInfiniteQuery({
      queryKey: ['contacts'],
      queryFn: ({ pageParam }) => fetch(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.results?.length === pageSize ? lastPage?.cursorState : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  };
};
