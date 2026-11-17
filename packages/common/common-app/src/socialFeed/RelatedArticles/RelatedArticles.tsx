import { ChannelDefinition, PostContent } from '@homebase-id/js-lib/public';
import { PostTeaser } from '../PostListItem/PostTeaser';
import { ArticleTeaser } from '../Blocks/Body/ArticleTeaser';
import { FakeAnchor } from '../../ui';
import { HOME_ROOT_PATH } from '../../constants';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { t } from '../../helpers/i18n/dictionary';
import { usePostsInfinite } from '../../hooks/socialFeed/post/usePostsInfinite';
import { ChannelDefinitionVm } from '../../hooks/socialFeed/channels/useChannels';

// An article's own card: the cover when it has one, else text only; every card in a row is as tall as the tallest
const RelatedArticleCard = ({
  postFile,
  channelSlug,
}: {
  postFile: HomebaseFile<PostContent>;
  /** The channel's slug, for the link; its id without one (the page resolves either) */
  channelSlug?: string;
}) => {
  const post = postFile.fileMetadata.appData.content;

  return (
    <FakeAnchor
      href={`${HOME_ROOT_PATH}posts/${channelSlug ?? post.channelId}/${post.slug ?? post.id}`}
      className="block rounded-lg border border-card-outline bg-background p-4 transition-colors hover:shadow-md hover:shadow-card-shadow"
    >
      <ArticleTeaser postFile={postFile} />
    </FakeAnchor>
  );
};

export const RelatedArticles = ({
  blog,
  channel,
  onPaper,
}: {
  blog: HomebaseFile<PostContent>;
  channel: NewHomebaseFile<ChannelDefinitionVm | ChannelDefinition> | undefined;
  /** Under the article reader: on its page, set off by a hairline rather than a band of its own */
  onPaper?: boolean;
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
    <section
      className={`mt-10 pb-10 pt-16 ${
        onPaper
          ? 'border-t border-[color:var(--article-outline-variant)]'
          : 'bg-related-articles'
      }`}
    >
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
                channelSlug={channel?.fileMetadata.appData.content.slug}
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
