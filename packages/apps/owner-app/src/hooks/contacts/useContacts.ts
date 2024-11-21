import { useInfiniteQuery } from '@tanstack/react-query';
import { CursoredResult, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { parseContact } from './useContact';
import { ContactVm, getContacts } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '@homebase-id/common-app';

const pageSize = 10;

export const useContacts = () => {
  const dotYouClient = useDotYouClientContext();

  const fetch = async (
    cursorState?: string
  ): Promise<CursoredResult<NewHomebaseFile<ContactVm>[]>> => {
    const data = await getContacts(dotYouClient, cursorState, pageSize);
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
