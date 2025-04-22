import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogConfig, PostContent } from '@homebase-id/js-lib/public';

import { ApiType, OdinClient, HomebaseFile, deleteFile } from '@homebase-id/js-lib/core';
import { invalidateSocialFeeds } from './useSocialFeed';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useManageSocialFeed = (props?: { odinId: string }) => {
  const odinId = props?.odinId || window.location.hostname;

  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const removeFromFeed = async ({ postFile }: { postFile: HomebaseFile<PostContent> }) => {
    return await deleteFile(
      odinClient,
      BlogConfig.FeedDrive,
      postFile.fileId,
      undefined,
      undefined,
      undefined,
      true
    );
  };

  const getContentReportUrl = () => {
    const host = new OdinClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot();

    // Fetch the reporting url from the other identities config
    return fetch(`${host}/config/reporting`)
      .then((res) => {
        return res.json();
      })
      .then((data: { url: string }) => {
        return data.url;
      })
      .catch(() => {
        return `https://ravenhosting.cloud/report`;
      });
  };

  return {
    removeFromFeed: useMutation({
      mutationFn: removeFromFeed,
      onSettled: () => invalidateSocialFeeds(queryClient),
    }),
    getReportContentUrl: getContentReportUrl,
  };
};
