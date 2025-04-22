import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Article, PostContent, getPosts, removePost } from '@homebase-id/js-lib/public';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useChannels } from '../channels/useChannels';
import { useOdinClientContext } from '../../auth/useOdinClientContext';

export const useDrafts = () => {
  const queryClient = useQueryClient();

  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const odinClient = useOdinClientContext();

  const fetch = async () => {
    if (!channels) return;

    const drafts = await Promise.all(
      channels.map(async (channel) => {
        return await getPosts<Article>(
          odinClient,
          channel.fileMetadata.appData.uniqueId as string,
          undefined,
          'only',
          undefined,
          10
        );
      })
    );

    return drafts?.flatMap((item) => item.results);
  };

  const remove = async ({
    channelId,
    postFile,
  }: {
    channelId: string;
    postFile: HomebaseFile<PostContent>;
  }) => {
    return await removePost(odinClient, postFile, channelId);
  };

  return {
    fetch: useQuery({ queryKey: ['drafts'], queryFn: fetch, enabled: !!channels }),
    remove: useMutation({
      mutationFn: remove,
      onMutate: async (toRemoveDetails) => {
        const previousDrafts = updateCacheDrafts(queryClient, (drafts) =>
          drafts.filter((post) => post.fileId !== toRemoveDetails.postFile.fileId)
        );
        return { toRemoveDetails, previousDrafts };
      },
      onError: (err, _toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        updateCacheDrafts(queryClient, () => context?.previousDrafts);
      },
      onSettled: () => {
        invalidateDrafts(queryClient);
      },
    }),
  };
};

export const invalidateDrafts = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['drafts'] });
};

export const updateCacheDrafts = (
  queryClient: QueryClient,
  transformFn: (drafts: HomebaseFile<Article>[]) => HomebaseFile<Article>[] | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<Article>[]>(['drafts']);
  if (!currentData) return;

  const updatedData = transformFn(currentData);
  if (!updatedData) return;
  queryClient.setQueryData(['drafts'], updatedData);

  return currentData;
};
