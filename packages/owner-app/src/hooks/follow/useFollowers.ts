import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, fetchFollowers } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

type useFollowerInfiniteProps = {
  pageSize?: number;
};

const useFollowerInfinite = ({ pageSize = 30 }: useFollowerInfiniteProps) => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchBlogData = async ({ pageParam }: { pageParam?: string }) => {
    const response = await fetchFollowers(dotYouClient, pageParam);
    return response;
  };

  return useInfiniteQuery(['followers'], ({ pageParam }) => fetchBlogData({ pageParam }), {
    getNextPageParam: (lastPage) =>
      (lastPage?.results?.length >= pageSize && lastPage?.cursorState) ?? undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

export default useFollowerInfinite;
