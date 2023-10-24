import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Article, getPosts, PostFile, removePost } from '@youfoundation/js-lib/public';
import { useChannels, useDotYouClient } from '@youfoundation/common-app';

export const useDrafts = () => {
  const queryClient = useQueryClient();

  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async () => {
    if (!channels) {
      return;
    }

    const drafts = await Promise.all(
      channels.map(async (channel) => {
        return await getPosts<Article>(
          dotYouClient,
          channel.channelId,
          undefined,
          'only',
          undefined,
          10
        );
      })
    );

    return drafts?.flatMap((item) => item.results);
  };

  const remove = async ({ channelId, postFileId }: { channelId: string; postFileId: string }) => {
    return await removePost(dotYouClient, postFileId, channelId);
  };

  return {
    fetch: useQuery(['drafts'], () => fetch(), { enabled: !!channels }),
    remove: useMutation(remove, {
      onMutate: async (toRemoveDetails) => {
        await queryClient.cancelQueries(['drafts']);

        // Updates
        const previousDrafts: PostFile<Article>[] | undefined = queryClient.getQueryData([
          'drafts',
        ]);
        const updatedDrafts = previousDrafts?.filter(
          (post) => post.fileId !== toRemoveDetails.postFileId
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
        queryClient.invalidateQueries(['drafts']);
      },
    }),
  };
};
