import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPost, getPostBySlug, PostContent } from '@youfoundation/js-lib/public';

import { useBlogPostsInfiniteReturn } from './useBlogPostsInfinite';
import { useChannel, useDotYouClient } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';

type useBlogProps = {
  channelId?: string;
  channelSlug?: string;
  blogSlug?: string;
};

export const useBlog = ({ channelSlug, channelId, blogSlug }: useBlogProps = {}) => {
  const { data: channel, isFetched: channelFetched } = useChannel({
    channelSlug,
    channelId,
  }).fetch;

  const { getDotYouClient, isOwner } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const queryClient = useQueryClient();

  const getCachedBlogs = (channelId?: string) => {
    const infinite =
      queryClient.getQueryData<InfiniteData<useBlogPostsInfiniteReturn>>(['blogs', channelId]) ||
      queryClient.getQueryData<InfiniteData<useBlogPostsInfiniteReturn>>(['blogs', undefined]);
    if (infinite) return infinite.pages.flatMap((page) => page.results);

    return (
      queryClient.getQueryData<DriveSearchResult<PostContent>[]>(['blog-recents', channelId]) ||
      queryClient.getQueryData<DriveSearchResult<PostContent>[]>(['blog-recents', undefined])
    );
  };

  const fetchBlog = async ({ blogSlug }: useBlogProps) => {
    if (!channel || !blogSlug) {
      return;
    }

    const cachedBlogs = getCachedBlogs(channel.fileMetadata.appData.uniqueId);
    if (cachedBlogs) {
      const foundBlog = cachedBlogs.find(
        (blog) =>
          blog.fileMetadata.appData.content?.slug === blogSlug ||
          blog.fileMetadata.appData.content.id === blogSlug
      );
      if (foundBlog) return { activeBlog: foundBlog, activeChannel: channel };
    }

    const postFile =
      (await getPostBySlug(
        dotYouClient,
        channel.fileMetadata.appData.uniqueId as string,
        blogSlug
      )) ||
      (await getPost(dotYouClient, channel.fileMetadata.appData.uniqueId as string, blogSlug));

    if (postFile) return { activeBlog: postFile, activeChannel: channel };
  };

  return useQuery({
    queryKey: ['blog', blogSlug, channelSlug || channelId],
    queryFn: () => fetchBlog({ blogSlug }),
    refetchOnMount: false,
    enabled: channelFetched && !!blogSlug,
    gcTime: 10 * 60 * 1000,
    staleTime: isOwner ? 0 : 10 * 60 * 1000,
  });
};
