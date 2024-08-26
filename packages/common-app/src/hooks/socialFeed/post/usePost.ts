import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPost, getPostBySlug, PostContent } from '@homebase-id/js-lib/public';

import { usePostsInfiniteReturn } from './usePostsInfinite';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useChannel } from '../channels/useChannel';
import { useDotYouClient } from '../../auth/useDotYouClient';

type usePostProps = {
  channelId?: string;
  channelSlug?: string;
  blogSlug?: string;
};

export const usePost = ({ channelSlug, channelId, blogSlug }: usePostProps = {}) => {
  const { data: channel, isFetched: channelFetched } = useChannel({
    channelSlug,
    channelId,
  }).fetch;

  const { getDotYouClient, isOwner } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const getCachedBlogs = (channelId?: string) => {
    const infinite =
      queryClient.getQueryData<InfiniteData<usePostsInfiniteReturn>>(['blogs', channelId]) ||
      queryClient.getQueryData<InfiniteData<usePostsInfiniteReturn>>(['blogs', undefined]);
    if (infinite) return infinite.pages.flatMap((page) => page.results);

    return (
      queryClient.getQueryData<HomebaseFile<PostContent>[]>(['blog-recents', channelId]) ||
      queryClient.getQueryData<HomebaseFile<PostContent>[]>(['blog-recents', undefined])
    );
  };

  const fetchBlog = async ({ blogSlug }: usePostProps) => {
    if (!channel || !blogSlug) return null;

    const cachedBlogs = getCachedBlogs(channel.fileMetadata.appData.uniqueId);
    if (cachedBlogs) {
      const foundBlog = cachedBlogs.find(
        (blog) =>
          blog.fileMetadata.appData.content?.slug === blogSlug ||
          blog.fileMetadata.appData.content.id === blogSlug
      );
      if (foundBlog) return { activePost: foundBlog, activeChannel: channel };
    }

    const postFile =
      (await getPostBySlug(
        dotYouClient,
        channel.fileMetadata.appData.uniqueId as string,
        blogSlug
      )) ||
      (await getPost(dotYouClient, channel.fileMetadata.appData.uniqueId as string, blogSlug));

    if (postFile) return { activePost: postFile, activeChannel: channel };
  };

  return useQuery({
    queryKey: ['blog', blogSlug, channelSlug || channelId],
    queryFn: () => fetchBlog({ blogSlug }),
    refetchOnMount: false,
    enabled: channelFetched && !!blogSlug,
    gcTime: isOwner ? 0 : 10 * 60 * 1000,
    staleTime: isOwner ? 0 : 10 * 60 * 1000,
  });
};
