import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getPosts,
  getRecentPosts,
  PostContent,
  PostFile,
  PostType,
} from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../..';

type useBlogPostsInfiniteProps = {
  channelId?: string;
  pageSize?: number;
  postType?: PostType;
  enabled?: boolean;
};

export type useBlogPostsInfiniteReturn = {
  results: PostFile<PostContent>[];
  cursorState: string | Record<string, string>;
};

export const useBlogPostsInfinite = ({
  channelId,
  pageSize = 30,
  postType,
  enabled = true,
}: useBlogPostsInfiniteProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchBlogData = async ({
    channelId,
    pageParam,
  }: {
    channelId?: string;
    pageParam: string | Record<string, string> | undefined;
  }): Promise<useBlogPostsInfiniteReturn> => {
    const response = channelId
      ? await getPosts(
          dotYouClient,
          channelId,
          postType,
          false,
          typeof pageParam === 'string' ? pageParam : undefined,
          pageSize
        )
      : await getRecentPosts(
          dotYouClient,
          postType,
          false,
          typeof pageParam === 'object' ? pageParam : undefined,
          pageSize
        );

    return {
      results: response.results.filter((file) => !file.isDraft),
      cursorState: response.cursorState,
    };
  };

  return useInfiniteQuery(
    ['blogs', channelId, postType],
    ({ pageParam }) => fetchBlogData({ channelId, pageParam }),
    {
      getNextPageParam: (lastPage) =>
        (lastPage?.results?.length >= pageSize && lastPage?.cursorState) ?? undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: enabled,
    }
  );
};
