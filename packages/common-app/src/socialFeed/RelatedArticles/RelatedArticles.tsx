import { ChannelDefinition, PostContent } from '@youfoundation/js-lib/public';
import { t, useBlogPostsInfinite } from '@youfoundation/common-app';
import { ChannelDefinitionVm } from '@youfoundation/common-app';
import { PostTeaser } from '../PostListItem/PostTeaser';
import { DriveSearchResult } from '@youfoundation/js-lib/core';

export const RelatedArticles = ({
  blog,
  channel,
}: {
  blog: DriveSearchResult<PostContent>;
  channel: ChannelDefinitionVm | ChannelDefinition | undefined;
}) => {
  const { data: blogPosts } = useBlogPostsInfinite(
    channel ? { channelId: channel.channelId, postType: 'Article' } : {}
  );

  if (!blogPosts) return null;

  const flattenedPosts = blogPosts ? blogPosts?.pages?.flatMap((page) => page.results) : [];
  const filteredBlogPosts = flattenedPosts
    .slice(0, 4)
    .filter(
      (relatedBlog) =>
        relatedBlog.fileMetadata.appData.content.id !== blog.fileMetadata.appData.content.id
    )
    .slice(0, 3);

  if (!filteredBlogPosts?.length) return null;

  return (
    <section className="mt-10 bg-slate-50 pb-10 pt-16 dark:bg-slate-800 dark:bg-opacity-50">
      <div className="container mx-auto px-2 sm:px-5">
        <h2 className="mb-10 text-2xl ">
          {t('Latest posts')} {channel && <small>| {channel.name}</small>}
        </h2>
        <div className="-m-1 flex flex-row flex-wrap">
          {filteredBlogPosts.map((postFile) => {
            return (
              <PostTeaser
                postFile={postFile}
                key={postFile.fileMetadata.appData.content.id}
                className={`p-1 sm:w-1/2 md:w-1/3`}
                forceAspectRatio={true}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
