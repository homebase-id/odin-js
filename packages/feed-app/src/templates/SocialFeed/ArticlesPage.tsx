import { InfiniteData } from '@tanstack/react-query';
import { Article } from '@youfoundation/js-lib/public';
import {
  ActionButton,
  ActionLink,
  Article as ArticleIcon,
  BLOG_POST_INFIITE_PAGE_SIZE,
  HOME_ROOT_PATH,
  LoadingBlock,
  Plus,
  PostTextListItem,
  SubtleMessage,
  useBlogPostsInfinite,
  useDrafts,
} from '@youfoundation/common-app';
import { flattenInfinteData } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';

import { useChannels } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ROOT_PATH } from '../../app/App';

export const ArticlesPage = () => {
  return (
    <>
      <PageMeta
        title={t('Articles')}
        icon={ArticleIcon}
        breadCrumbs={[{ title: t('Feed'), href: ROOT_PATH }, { title: t('Articles') }]}
        actions={
          <ActionLink onClick={() => (window.location.href = `${ROOT_PATH}/new`)} icon={Plus}>
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
        ) : null}
        {drafts ? (
          <div className="-m-3">
            {drafts.map((draft, index) => {
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
                  linkRoot={`${ROOT_PATH}/edit`}
                />
              );
            })}
          </div>
        ) : null}
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
  } = useBlogPostsInfinite({
    postType: 'Article',
    includeHidden: true,
  });

  const flattenedPosts = flattenInfinteData<HomebaseFile<Article>>(
    articleData as InfiniteData<{
      results: HomebaseFile<Article>[];
      cursorState: unknown;
    }>,
    BLOG_POST_INFIITE_PAGE_SIZE
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
          <div className="-m-3">
            {!flattenedPosts.length ? (
              <SubtleMessage className="m-3">{t('No articles found')}</SubtleMessage>
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
                  />
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
