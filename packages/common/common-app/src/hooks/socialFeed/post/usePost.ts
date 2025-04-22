import {
  InfiniteData,
  QueryClient,
  UndefinedInitialDataOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ChannelDefinition,
  getPost,
  getPostByFileId,
  getPostByGlobalTransitId,
  getPostBySlug,
  PostContent,
} from '@homebase-id/js-lib/public';

import { usePostsInfiniteReturn } from './usePostsInfinite';
import { OdinClient, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { useChannel } from '../channels/useChannel';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  getPostBySlugOverPeer,
  getPostOverPeer,
  RecentsFromConnectionsReturn,
} from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '../../auth/useOdinClientContext';

type usePostProps = {
  odinId?: string;
  channelKey?: string;
  postKey?: string;
};

export const usePost = ({ odinId, channelKey, postKey }: usePostProps = {}) => {
  const { data: channel } = useChannel({
    odinId,
    channelKey,
  }).fetch;

  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const queryClient = useQueryClient();

  return useQuery(
    getPostQueryOptions(odinClient, queryClient, isOwner, odinId, channel || undefined, postKey)
  );
};

const getLocalCachedBlogs = (queryClient: QueryClient, channelId?: string) => {
  const infinite =
    queryClient.getQueryData<InfiniteData<usePostsInfiniteReturn>>(['posts', channelId]) ||
    queryClient.getQueryData<InfiniteData<usePostsInfiniteReturn>>(['posts', undefined]);
  if (infinite) return infinite.pages.flatMap((page) => page.results);

  return (
    queryClient.getQueryData<HomebaseFile<PostContent>[]>(['blog-recents', channelId]) ||
    queryClient.getQueryData<HomebaseFile<PostContent>[]>(['blog-recents', undefined])
  );
};

const fetchBlog = async ({
  odinClient,
  queryClient,
  odinId,
  channel,
  postKey,
}: {
  odinClient: OdinClient;
  queryClient: QueryClient;

  odinId?: string;
  channel?: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
  postKey: string;
}) => {
  if (!channel || !postKey) return null;

  if (!odinId || odinId === odinClient.getHostIdentity()) {
    // Search in cache
    const localBlogs = getLocalCachedBlogs(queryClient, channel.fileMetadata.appData.uniqueId);
    if (localBlogs) {
      const foundBlog = localBlogs.find(
        (blog) =>
          blog.fileMetadata.appData.content?.slug === postKey ||
          stringGuidsEqual(blog.fileMetadata.appData.content.id, postKey) ||
          stringGuidsEqual(blog.fileId, postKey) ||
          stringGuidsEqual(blog.fileMetadata.globalTransitId, postKey)
      );
      if (foundBlog) return foundBlog;
    }

    const postFile =
      (await getPostBySlug(
        odinClient,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      )) ||
      (await getPost(odinClient, channel.fileMetadata.appData.uniqueId as string, postKey)) ||
      (await getPostByFileId(
        odinClient,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      )) ||
      (await getPostByGlobalTransitId(
        odinClient,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      ));

    return postFile;
  } else {
    // Search in social feed cache
    const socialFeedCache = queryClient.getQueryData<InfiniteData<RecentsFromConnectionsReturn>>([
      'social-feeds',
    ]);
    if (socialFeedCache) {
      for (let i = 0; socialFeedCache && i < socialFeedCache.pages.length; i++) {
        const page = socialFeedCache.pages[i];
        const post = page.results.find(
          (x) =>
            x.fileMetadata.appData.content?.slug === postKey ||
            stringGuidsEqual(x.fileMetadata.appData.content.id, postKey)
        );
        if (post) return post;
      }
    }
    return (
      (await getPostBySlugOverPeer(
        odinClient,
        odinId,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      )) ||
      (await getPostOverPeer(
        odinClient,
        odinId,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      ))
    );
  }
};

export const getPostQueryOptions: (
  odinClient: OdinClient,
  queryClient: QueryClient,
  isOwner: boolean,
  odinId: string | undefined,
  channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | undefined,
  postKey: string | undefined
) => UndefinedInitialDataOptions<HomebaseFile<PostContent> | null> = (
  odinClient,
  queryClient,
  isOwner,
  odinId,
  channel,
  postKey
) => ({
  queryKey: [
    'post',
    odinId || odinClient.getHostIdentity(),
    channel?.fileMetadata.appData.uniqueId,
    postKey,
  ],
  queryFn: () =>
    fetchBlog({ odinClient, queryClient, odinId, channel, postKey: postKey as string }),
  enabled: !!channel && !!postKey,
  staleTime: isOwner ? 0 : 1000 * 60 * 10, // 10 minutes
});

export const invalidatePost = (
  queryClient: QueryClient,
  odinId?: string | undefined,
  channelId?: string | undefined,
  postKey?: string | undefined
) => {
  queryClient.invalidateQueries({
    queryKey: ['post', odinId, channelId, postKey].filter(Boolean),
    exact: !!odinId && !!channelId && !!postKey,
  });
};
