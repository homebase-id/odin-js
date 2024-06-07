import { ChannelDefinition, PostContent } from '@youfoundation/js-lib/public';
import { PostTeaser } from '../PostListItem/PostTeaser';
import { HomebaseFile, NewHomebaseFile } from '@youfoundation/js-lib/core';
import { t } from '../../helpers/i18n/dictionary';
import { useBlogPostsInfinite } from '../../hooks/socialFeed/post/usePostsInfinite';
import { ChannelDefinitionVm } from '../../hooks/socialFeed/channels/useChannels';

export const RelatedArticles = ({
  blog,
  channel,
}: {
  blog: HomebaseFile<PostContent>;
  channel: NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition> | undefined;
}) => {
  const { data: blogPosts } = useBlogPostsInfinite(
    channel ? { channelId: channel.fileMetadata.appData.uniqueId, postType: 'Article' } : {}
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
          {t('Latest posts')}{' '}
          {channel && <small>| {channel.fileMetadata.appData.content.name}</small>}
        </h2>
        <div className="-m-1 flex flex-row flex-wrap">
          {filteredBlogPosts.map((postFile) => {
            return (
              <PostTeaser
                postFile={postFile}
                key={postFile.fileMetadata.appData.content.id}
                className={`p-1 sm:w-1/2 md:w-1/3`}
                forceAspectRatio={true}
                showAuthor={channel?.fileMetadata.appData.content.isCollaborative}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
