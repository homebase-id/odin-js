import { BlogConfig, ChannelDefinition, PostContent } from '@homebase-id/js-lib/public';
import { PostTeaser } from '../PostListItem/PostTeaser';
import { ArticleTeaser } from '../Blocks/Body/ArticleTeaser';
import { FakeAnchor } from '../../ui';
import { useChannel } from '../../hooks/socialFeed/channels/useChannel';
import { HOME_ROOT_PATH } from '../../constants';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { t } from '../../helpers/i18n/dictionary';
import { usePostsInfinite } from '../../hooks/socialFeed/post/usePostsInfinite';
import { ChannelDefinitionVm } from '../../hooks/socialFeed/channels/useChannels';

// An article's own card: the cover when it has one, else text only; every card in a row is as tall as the tallest
const RelatedArticleCard = ({ postFile }: { postFile: HomebaseFile<PostContent> }) => {
  const post = postFile.fileMetadata.appData.content;
  const { data: channel } = useChannel({ channelKey: post.channelId }).fetch;
  const slug = channel ? channel.fileMetadata.appData.content.slug : BlogConfig.PublicChannelSlug;

  return (
    <FakeAnchor
      href={`${HOME_ROOT_PATH}posts/${slug}/${post.slug ?? post.id}`}
      className="block h-full rounded-lg border border-gray-200 border-opacity-60 bg-background p-4 transition-colors hover:shadow-md dark:border-gray-800 hover:dark:shadow-slate-600"
    >
      <ArticleTeaser postFile={postFile} />
    </FakeAnchor>
  );
};

export const RelatedArticles = ({
  blog,
  channel,
}: {
  blog: HomebaseFile<PostContent>;
  channel: NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition> | undefined;
}) => {
  const { data: blogPosts } = usePostsInfinite(
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {filteredBlogPosts.map((postFile) => {
            return postFile.fileMetadata.appData.content.type === 'Article' ? (
              <RelatedArticleCard
                postFile={postFile}
                key={postFile.fileMetadata.appData.content.id}
              />
            ) : (
              <PostTeaser
                postFile={postFile}
                key={postFile.fileMetadata.appData.content.id}
                className="h-full"
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
