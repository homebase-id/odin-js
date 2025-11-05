import {
  InfiniteData,
  QueryClient,
  UndefinedInitialDataOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ChannelDefinition,
  getChannelDrive,
  getPost,
  getPostByFileId,
  getPostByGlobalTransitId,
  getPostBySlug,
  POST_FULL_TEXT_PAYLOAD_KEY,
  PostContent,
} from '@homebase-id/js-lib/public';

import { usePostsInfiniteReturn } from './usePostsInfinite';
import { DotYouClient, getPayloadAsJson, getPayloadAsJsonByUniqueId, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { useChannel } from '../channels/useChannel';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import {
  getPayloadAsJsonOverPeer,
  getPayloadAsJsonOverPeerByGlobalTransitId,
  getPostBySlugOverPeer,
  getPostOverPeer,
  RecentsFromConnectionsReturn,
} from '@homebase-id/js-lib/peer';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

type usePostProps = {
  odinId?: string;
  channelKey?: string;
  postKey?: string;
};

// Hydrate a post file with the full-text payload when available (local or over peer), mutating postFile in place
const hydratePostWithFullTextIfAvailable = async ({
  dotYouClient,
  odinId,
  channelUniqueId,
  postFile,
}: {
  dotYouClient: DotYouClient;
  odinId?: string;
  channelUniqueId: string;
  postFile: HomebaseFile<PostContent>;
}): Promise<PostContent | undefined> => {
  const hasFullTextPayload = postFile.fileMetadata.payloads?.some(
    (p) => p.key === POST_FULL_TEXT_PAYLOAD_KEY
  );
  if (!hasFullTextPayload) return;// no full-text payload to hydrate ;

  const targetDrive = getChannelDrive(channelUniqueId);
  const payloadKey = POST_FULL_TEXT_PAYLOAD_KEY;

  let payloadData: PostContent | null | undefined;

  const isPeer = !!odinId && odinId !== dotYouClient.getHostIdentity();
  console.log('isPeer', isPeer);
  if (isPeer) {
    payloadData =
      (await getPayloadAsJsonOverPeer<PostContent>(
        dotYouClient,
        odinId as string,
        targetDrive,
        postFile.fileId as string,
        payloadKey
      )) ||
      (await getPayloadAsJsonOverPeerByGlobalTransitId<PostContent>(
        dotYouClient,
        odinId as string,
        targetDrive,
        postFile.fileMetadata.globalTransitId as string,
        payloadKey
      ));
  } else {
    // Local owner
    const fileId = postFile.fileId;
    payloadData =
      (await getPayloadAsJson<PostContent>(
        dotYouClient,
        targetDrive,
        fileId,
        payloadKey
      )) ||
      (await getPayloadAsJsonByUniqueId<PostContent>(
        dotYouClient,
        targetDrive,
        postFile.fileMetadata.appData.uniqueId as string,
        payloadKey
      ));
  }

  return {
    ...postFile.fileMetadata.appData.content,
    ...payloadData,
  };
};

export const usePost = ({ odinId, channelKey, postKey }: usePostProps = {}) => {
  const { data: channel } = useChannel({
    odinId,
    channelKey,
  }).fetch;

  const dotYouClient = useDotYouClientContext();
  const isOwner = dotYouClient.isOwner();
  const queryClient = useQueryClient();

  return useQuery(
    getPostQueryOptions(dotYouClient, queryClient, isOwner, odinId, channel || undefined, postKey)
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
  dotYouClient,
  queryClient,
  odinId,
  channel,
  postKey,
}: {
  dotYouClient: DotYouClient;
  queryClient: QueryClient;

  odinId?: string;
  channel?: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
  postKey: string;
}) => {
  if (!channel || !postKey) return null;

  if (!odinId || odinId === dotYouClient.getHostIdentity()) {
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
        dotYouClient,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      )) ||
      (await getPost(dotYouClient, channel.fileMetadata.appData.uniqueId as string, postKey)) ||
      (await getPostByFileId(
        dotYouClient,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      )) ||
      (await getPostByGlobalTransitId(
        dotYouClient,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      ));

    if (postFile) {
      postFile.fileMetadata.appData.content = await hydratePostWithFullTextIfAvailable({
        dotYouClient,
        odinId: undefined,
        channelUniqueId: channel.fileMetadata.appData.uniqueId as string,
        postFile,
      }) || postFile.fileMetadata.appData.content;
    }

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

        // if post found the chances is the full text payload is not there , so we need to fetch it
        if (post) {
          post.fileMetadata.appData.content = await hydratePostWithFullTextIfAvailable({
            dotYouClient,
            odinId,
            channelUniqueId: channel.fileMetadata.appData.uniqueId as string,
            postFile: post,
          }) || post.fileMetadata.appData.content;
          return post;
        }
      }
    }
    const postFile = (
      (await getPostBySlugOverPeer(
        dotYouClient,
        odinId,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      )) ||
      (await getPostOverPeer(
        dotYouClient,
        odinId,
        channel.fileMetadata.appData.uniqueId as string,
        postKey
      ))
    );
    if (postFile) {
      postFile.fileMetadata.appData.content = await hydratePostWithFullTextIfAvailable({
        dotYouClient,
        odinId,
        channelUniqueId: channel.fileMetadata.appData.uniqueId as string,
        postFile,
      }) || postFile.fileMetadata.appData.content;
    }

    return postFile;

  }
};

export const getPostQueryOptions: (
  dotYouClient: DotYouClient,
  queryClient: QueryClient,
  isOwner: boolean,
  odinId: string | undefined,
  channel: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition> | undefined,
  postKey: string | undefined
) => UndefinedInitialDataOptions<HomebaseFile<PostContent> | null> = (
  dotYouClient,
  queryClient,
  isOwner,
  odinId,
  channel,
  postKey
) => ({
  queryKey: [
    'post',
    odinId || dotYouClient.getHostIdentity(),
    channel?.fileMetadata.appData.uniqueId,
    postKey,
  ],
  queryFn: () =>
    fetchBlog({ dotYouClient, queryClient, odinId, channel, postKey: postKey as string }),
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
