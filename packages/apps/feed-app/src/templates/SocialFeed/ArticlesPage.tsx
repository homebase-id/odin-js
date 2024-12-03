import { InfiniteData } from '@tanstack/react-query';
import { Article } from '@homebase-id/js-lib/public';
import {
  ActionButton,
  ActionLink,
  BLOG_POST_INFIITE_PAGE_SIZE,
  HOME_ROOT_PATH,
  LoadingBlock,
  PostTextListItem,
  SubtleMessage,
  usePostsInfinite,
  useDrafts,
  FEED_ROOT_PATH,
} from '@homebase-id/common-app';
import { Article as ArticleIcon, Pencil, Plus } from '@homebase-id/common-app/icons';
import { flattenInfinteData } from '@homebase-id/common-app';
import { t } from '@homebase-id/common-app';

import { useChannels } from '@homebase-id/common-app';
import { PageMeta } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const ArticlesPage = () => {
  return (
    <>
      <PageMeta
        title={t('Articles')}
        icon={ArticleIcon}
        breadCrumbs={[{ title: t('Feed'), href: FEED_ROOT_PATH }, { title: t('Articles') }]}
        actions={
          <ActionLink onClick={() => (window.location.href = `${FEED_ROOT_PATH}/new`)} icon={Plus}>
            {t('New Article')}
          </ActionLink>
        }
      />

      <DraftsView />
      <PublishedArticlesView />
    </>
  );
};

const DraftsView = () => {
  const { data: drafts, isLoading: draftsLoading } = useDrafts().fetch;
  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });

  return (
    <section className="pb-10">
      <div className="px-2 sm:px-10">
        <h2 className="mb-5 text-xl">{t('Drafts')}</h2>
        {draftsLoading ? (
          <>
            <LoadingBlock className="my-2 h-4" />
            <LoadingBlock className="my-2 h-4" />
            <LoadingBlock className="my-2 h-4" />
          </>
        ) : null}
        {(!drafts || !drafts.length) && !draftsLoading ? (
          <SubtleMessage>{t('No drafts found')}</SubtleMessage>
        ) : (
          <div className="flex flex-col gap-3">
            {drafts?.map((draft, index) => {
              const channel = channels?.find((chnl) =>
                stringGuidsEqual(
                  chnl.fileMetadata.appData.uniqueId,
                  draft.fileMetadata.appData.content.channelId
                )
              );
              return (
                <PostTextListItem
                  draft={draft}
                  channel={channel}
                  key={draft.fileId ?? index}
                  className="bg-background"
                  linkRoot={`${FEED_ROOT_PATH}/edit`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

const PublishedArticlesView = () => {
  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });

  const {
    data: articleData,
    isLoading: articlesLoading,
    hasNextPage,
    fetchNextPage,
  } = usePostsInfinite({
    postType: 'Article',
    includeHidden: true,
  });

  const flattenedPosts = flattenInfinteData<HomebaseFile<Article>>(
    articleData as InfiniteData<{
      results: HomebaseFile<Article>[];
      cursorState: unknown;
    }>,
    hasNextPage ? BLOG_POST_INFIITE_PAGE_SIZE : undefined
  );

  return (
    <section className="pb-10">
      <div className="px-2 sm:px-10">
        <h2 className="mb-5 text-xl">{t('Published articles')}</h2>
        {articlesLoading ? (
          <>
            <LoadingBlock className="my-2 h-4" />
            <LoadingBlock className="my-2 h-4" />
            <LoadingBlock className="my-2 h-4" />
          </>
        ) : null}
        {!articleData && !articlesLoading ? <>{t('No articles found')}</> : null}
        {articleData ? (
          <div className="flex flex-col gap-3">
            {!flattenedPosts.length ? (
              <SubtleMessage>{t('No articles found')}</SubtleMessage>
            ) : (
              flattenedPosts.map((draft, index) => {
                const channel = channels?.find((chnl) =>
                  stringGuidsEqual(
                    chnl.fileMetadata.appData.uniqueId,
                    draft.fileMetadata.appData.content.channelId
                  )
                );
                return (
                  <PostTextListItem
                    draft={draft}
                    channel={channel}
                    key={draft.fileId ?? index}
                    className="bg-background"
                    linkRoot={`${HOME_ROOT_PATH}posts`}
                  >
                    <ActionLink
                      icon={Pencil}
                      type="mute"
                      size="none"
                      className="opacity-60 hover:opacity-100"
                      href={`${FEED_ROOT_PATH}/edit/${
                        channel?.fileMetadata.appData.content.slug ||
                        channel?.fileMetadata.appData.uniqueId
                      }/${draft.fileMetadata.appData.content.id}`}
                    />
                  </PostTextListItem>
                );
              })
            )}
          </div>
        ) : null}
        {hasNextPage ? (
          <div className="mt-10 flex flex-row justify-center">
            <ActionButton onClick={() => fetchNextPage()} type="secondary">
              {t('Load more')}
            </ActionButton>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ArticlesPage;
