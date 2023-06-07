import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrUpdateFollow, fetchFollowing, FollowRequest } from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

type useFollowingInfiniteProps = {
  pageSize?: number;
};

export const useFollowingInfinite = ({ pageSize = 30 }: useFollowingInfiniteProps) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchFollowingInternal = async ({ pageParam }: { pageParam?: string }) => {
    try {
      const response = await fetchFollowing(dotYouClient, pageParam);
      if (response) return response;
    } catch (ex) {
      //
    }
    return {
      results: [],
      cursorState: '',
    };
  };

  const createOrUpdateFollowInternal = async (request: FollowRequest) => {
    const response = await createOrUpdateFollow(dotYouClient, request);
    return response;
  };

  return {
    fetch: useInfiniteQuery(
      ['following'],
      ({ pageParam }) => fetchFollowingInternal({ pageParam }),
      {
        getNextPageParam: (lastPage) =>
          (lastPage?.results?.length &&
            lastPage?.results?.length >= pageSize &&
            lastPage?.cursorState) ??
          undefined,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
      }
    ),
    follow: useMutation(createOrUpdateFollowInternal, {
      onSuccess: () => {
        queryClient.invalidateQueries(['following']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
