import { useQuery } from '@tanstack/react-query';
import {
  GetFile,
  getPosts,
  getRecentPosts,
  PostContent,
  PostFile,
  PostType,
} from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../..';

type useBlogPostsProps = {
  channelId?: string;
  postType?: PostType;
  pageSize?: number;
};

export const useBlogPosts = ({ channelId, postType, pageSize = 10 }: useBlogPostsProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchBlogData = async ({ channelId }: { channelId?: string }) => {
    const fileData = await GetFile(dotYouClient, 'blogs.json');

    let foundBlogPosts: PostFile<PostContent>[] = [];
    // If located in a specific channel, only fetch those, otherwise fallback to recents;
    if (channelId) {
      if (fileData.has(channelId) && fileData.get(channelId)?.length) {
        foundBlogPosts =
          fileData
            .get(channelId)
            ?.map((entry) => {
              return {
                fileId: entry.header.fileId,
                globalTransitId: entry.header.fileMetadata.globalTransitId,
                content: entry.payload,
                previewThumbnail: entry.header.fileMetadata.appData.previewThumbnail,
                payloadIsEncrypted: entry.header.fileMetadata.payloadIsEncrypted,
              } as PostFile<PostContent>;
            })
            .filter((post) => (postType ? post?.content?.type === postType : true)) ?? [];
      } else {
        foundBlogPosts = (
          await getPosts(dotYouClient, channelId, postType, false, undefined, pageSize)
        ).results;
      }
    } else {
      if (fileData.size >= 1) {
        foundBlogPosts = [];

        for (const channelId of fileData.keys()) {
          foundBlogPosts = [
            ...foundBlogPosts,
            ...(fileData
              .get(channelId)
              ?.map((entry) => {
                return {
                  fileId: entry.header.fileId,
                  globalTransitId: entry.header.fileMetadata.globalTransitId,
                  content: entry.payload,
                  previewThumbnail: entry.header.fileMetadata.appData.previewThumbnail,
                  payloadIsEncrypted: entry.header.fileMetadata.payloadIsEncrypted,
                } as PostFile<PostContent>;
              })
              ?.filter((post) => (postType ? post?.content?.type === postType : true)) ?? []),
          ];

          // Sorted descending
          foundBlogPosts.sort((a, b) => b?.content?.dateUnixTime - a?.content?.dateUnixTime);
        }
      } else {
        foundBlogPosts = (await getRecentPosts(dotYouClient, postType, false, undefined, pageSize))
          .results;
      }
    }

    return foundBlogPosts
      .filter((post) => post !== undefined && post?.content?.id !== undefined && !post.isDraft)
      .slice(0, pageSize);
  };

  return useQuery(['blog-recents', channelId], () => fetchBlogData({ channelId }), {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    onError: (er) => {
      console.log(er);
    },
  });
};
