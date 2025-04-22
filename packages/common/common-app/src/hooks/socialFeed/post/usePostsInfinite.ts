import { QueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  BlogConfig,
  getPosts,
  getRecentPosts,
  PostContent,
  PostType,
} from '@homebase-id/js-lib/public';
import { getCachedPosts, getCachedRecentPosts } from './cachedDataHelpers';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useChannels } from '../channels/useChannels';
import { useOdinClientContext } from '../../auth/useOdinClientContext';

type usePostsInfiniteProps = {
  channelId?: string;
  postType?: PostType;
  enabled?: boolean;
  includeHidden?: boolean;
};

export type usePostsInfiniteReturn = {
  results: HomebaseFile<PostContent>[];
  cursorState: string | Record<string, string>;
};

export const BLOG_POST_INFIITE_PAGE_SIZE = 30;
export const usePostsInfinite = ({
  channelId,
  postType,
  enabled = true,
  includeHidden = false,
}: usePostsInfiniteProps) => {
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();
  const { data: channels } = useChannels({ isAuthenticated, isOwner });

  const fetchBlogData = async ({
    channelId,
    pageParam,
  }: {
    channelId?: string;
    pageParam: string | Record<string, string> | undefined;
  }): Promise<usePostsInfiniteReturn> => {
    const canRunCached = !pageParam && !isAuthenticated;
    const cachedData = canRunCached
      ? channelId
        ? await getCachedPosts(odinClient, channelId, postType)
        : await getCachedRecentPosts(odinClient, postType)
      : undefined;

    const response =
      cachedData ||
      (channelId
        ? await getPosts(
          odinClient,
          channelId,
          postType,
          false,
          typeof pageParam === 'string' ? pageParam : undefined,
          BLOG_POST_INFIITE_PAGE_SIZE
        )
        : await getRecentPosts(
          odinClient,
          postType,
          false,
          typeof pageParam === 'object' ? pageParam : undefined,
          BLOG_POST_INFIITE_PAGE_SIZE,
          channels,
          includeHidden
        ));

    return {
      results: response.results.filter(
        (file) => file.fileMetadata.appData.fileType !== BlogConfig.DraftPostFileType
      ),
      cursorState: response.cursorState,
    };
  };

  return useInfiniteQuery({
    queryKey: ['posts', channelId || '', postType || '', includeHidden],
    initialPageParam: undefined as string | Record<string, string> | undefined,
    queryFn: ({ pageParam }) => fetchBlogData({ channelId, pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage?.results?.length >= BLOG_POST_INFIITE_PAGE_SIZE ? lastPage.cursorState : undefined,
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: enabled,
  });
};

export const invalidatePosts = (queryClient: QueryClient, channelId: string) => {
  queryClient.invalidateQueries({ queryKey: ['posts', channelId], exact: false });
};
