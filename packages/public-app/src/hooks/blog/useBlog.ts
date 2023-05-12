import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { DotYouClient, getPost, getPostBySlug, PostContent, PostFile } from '@youfoundation/js-lib';

import useAuth from '../auth/useAuth';
import { useBlogPostsInfiniteReturn } from './useBlogPostsInfinite';
import { useChannel } from '@youfoundation/common-app';

type useBlogProps = {
  channelId?: string;
  channelSlug?: string;
  blogSlug?: string;
};

const useBlog = ({ channelSlug, channelId, blogSlug }: useBlogProps = {}) => {
  const { data: channel, isFetched: channelFetched } = useChannel({
    channelSlug,
    channelId,
  }).fetch;

  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const getCachedBlogs = (channelId?: string) => {
    const infinite =
      queryClient.getQueryData<InfiniteData<useBlogPostsInfiniteReturn>>(['blogs', channelId]) ||
      queryClient.getQueryData<InfiniteData<useBlogPostsInfiniteReturn>>(['blogs', undefined]);
    if (infinite) return infinite.pages.flatMap((page) => page.results);

    return (
      queryClient.getQueryData<PostFile<PostContent>[]>(['blog-recents', channelId]) ||
      queryClient.getQueryData<PostFile<PostContent>[]>(['blog-recents', undefined])
    );
  };

  const fetchBlog = async ({ blogSlug }: useBlogProps) => {
    if (!channel || !blogSlug) {
      return;
    }

    const cachedBlogs = getCachedBlogs(channel.channelId);
    if (cachedBlogs) {
      const foundBlog = cachedBlogs.find(
        (blog) => blog.content?.slug === blogSlug || blog.content.id === blogSlug
      );
      if (foundBlog) return { activeBlog: foundBlog, activeChannel: channel };
    }

    const postFile =
      (await getPostBySlug(dotYouClient, channel.channelId, blogSlug)) ||
      (await getPost(dotYouClient, channel.channelId, blogSlug));

    if (postFile) return { activeBlog: postFile, activeChannel: channel };
  };

  return useQuery(['blog', blogSlug, channelSlug || channelId], () => fetchBlog({ blogSlug }), {
    refetchOnMount: false,
    enabled: channelFetched && !!blogSlug,
  });
};

export default useBlog;
