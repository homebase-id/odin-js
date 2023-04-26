import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiType, CursoredResult, DotYouClient } from '@youfoundation/js-lib';
import { getContacts } from '../../provider/contact/ContactProvider';

import { RawContact } from '../../provider/contact/ContactTypes';
import useAuth from '../auth/useAuth';
import { parseContact } from './useContact';

const pageSize = 10;

const useContacts = () => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

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
