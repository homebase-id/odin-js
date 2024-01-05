import { useInfiniteQuery } from '@tanstack/react-query';
import {
  BlogConfig,
  getPosts,
  getRecentPosts,
  PostContent,
  PostType,
} from '@youfoundation/js-lib/public';
import { useChannels, useDotYouClient } from '../../..';
import { getCachedPosts, getCachedRecentPosts } from './cachedDataHelpers';
import { DriveSearchResult } from '@youfoundation/js-lib/core';

type useBlogPostsInfiniteProps = {
  channelId?: string;
  pageSize?: number;
  postType?: PostType;
  enabled?: boolean;
};

export type useBlogPostsInfiniteReturn = {
  results: DriveSearchResult<PostContent>[];
  cursorState: string | Record<string, string>;
};

export const useBlogPostsInfinite = ({
  channelId,
  pageSize = 30,
  postType,
  enabled = true,
}: useBlogPostsInfiniteProps) => {
  const { getDotYouClient, isOwner, getIdentity } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const isAuthenticated = isOwner || !!getIdentity();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });

  const fetchBlogData = async ({
    channelId,
    pageParam,
  }: {
    channelId?: string;
    pageParam: string | Record<string, string> | undefined;
  }): Promise<useBlogPostsInfiniteReturn> => {
    const canRunCached = !pageParam && !isAuthenticated;
    const cachedData = canRunCached
      ? channelId
        ? await getCachedPosts(dotYouClient, channelId, postType)
        : await getCachedRecentPosts(dotYouClient, postType)
      : undefined;

    const response =
      cachedData ||
      (channelId
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
            pageSize,
            channels,
            false
          ));

    return {
      results: response.results.filter(
        (file) => file.fileMetadata.appData.fileType !== BlogConfig.DraftPostFileType
      ),
      cursorState: response.cursorState,
    };
  };

  return useInfiniteQuery({
    queryKey: ['blogs', channelId, postType],
    initialPageParam: undefined as string | Record<string, string> | undefined,
    queryFn: ({ pageParam }) => fetchBlogData({ channelId, pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage?.results?.length >= pageSize ? lastPage.cursorState : undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled: enabled,
  });
};
