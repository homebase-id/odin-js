import { useInfiniteQuery } from '@tanstack/react-query';
import { CursoredResult } from '@youfoundation/js-lib/core';

import useAuth from '../auth/useAuth';
import { parseContact } from './useContact';
import { RawContact, getContacts } from '@youfoundation/js-lib/network';

const pageSize = 10;

const useContacts = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetch = async (cursorState: string): Promise<CursoredResult<RawContact[]>> => {
    const data = await await getContacts(dotYouClient, cursorState, pageSize);
    return { ...data, results: data.results.map((contact) => parseContact(contact)) };
  };

  return {
    fetch: useInfiniteQuery(['contacts'], ({ pageParam }) => fetch(pageParam), {
      getNextPageParam: (lastPage) =>
        (lastPage?.results?.length === pageSize && lastPage?.cursorState) ?? undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  };
};

export default useContacts;
