import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DotYouClient,
  createOrUpdateFollow,
  fetchFollowing,
  FollowRequest,
  Unfollow,
  UnfollowRequest,
} from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';

type useFollowingInfiniteProps = {
  pageSize?: number;
};

const useFollowingInfinite = ({ pageSize = 30 }: useFollowingInfiniteProps) => {
  const queryClient = useQueryClient();
  const { getSharedSecret, getApiType } = useAuth();

  const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

  const fetchBlogData = async ({ pageParam }: { pageParam?: string }) => {
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

  const createOrUpdate = async (request: FollowRequest) => {
    const response = await createOrUpdateFollow(dotYouClient, request);
    return response;
  };

  const endFollow = async (request: UnfollowRequest) => {
    const response = await Unfollow(dotYouClient, request);
    return response;
  };

  return {
    fetch: useInfiniteQuery(['following'], ({ pageParam }) => fetchBlogData({ pageParam }), {
      getNextPageParam: (lastPage) =>
        (lastPage?.results?.length &&
          lastPage?.results?.length >= pageSize &&
          lastPage?.cursorState) ??
        undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
    follow: useMutation(createOrUpdate, {
      onSuccess: () => {
        queryClient.invalidateQueries(['following']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    unfollow: useMutation(endFollow, {
      onSuccess: () => {
        queryClient.invalidateQueries(['following']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useFollowingInfinite;
