import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Article, PostContent, getPosts, removePost } from '@homebase-id/js-lib/public';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useDotYouClient } from '../../auth/useDotYouClient';
import { useChannels } from '../channels/useChannels';

export const useDrafts = () => {
  const queryClient = useQueryClient();

  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async () => {
    if (!channels) return;

    const drafts = await Promise.all(
      channels.map(async (channel) => {
        return await getPosts<Article>(
          dotYouClient,
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
    return await removePost(dotYouClient, postFile, channelId);
  };

  return {
    fetch: useQuery({ queryKey: ['drafts'], queryFn: fetch, enabled: !!channels }),
    remove: useMutation({
      mutationFn: remove,
      onMutate: async (toRemoveDetails) => {
        await queryClient.cancelQueries({ queryKey: ['drafts'] });

        // Updates
        const previousDrafts: HomebaseFile<Article>[] | undefined = queryClient.getQueryData([
          'drafts',
        ]);
        const updatedDrafts = previousDrafts?.filter(
          (post) => post.fileId !== toRemoveDetails.postFile.fileId
        );
        queryClient.setQueryData(['drafts'], updatedDrafts);

        return { toRemoveDetails, previousDrafts };
      },
      onError: (err, toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['drafts'], context?.previousDrafts);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['drafts'] });
      },
    }),
  };
};
