import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogConfig, PostContent } from '@youfoundation/js-lib/public';

import { useDotYouClient } from '@youfoundation/common-app';
import { DriveSearchResult, deleteFile } from '@youfoundation/js-lib/core';

export const useManageSocialFeed = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const removeFromFeed = async ({ postFile }: { postFile: DriveSearchResult<PostContent> }) => {
    return await deleteFile(dotYouClient, BlogConfig.FeedDrive, postFile.fileId);
  };

  return {
    removeFromFeed: useMutation({
      mutationFn: removeFromFeed,
      onMutate: async ({ postFile }) => {
        //
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['social-feeds'] });
      },
    }),
  };
};
