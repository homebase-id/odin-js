import { InfiniteData } from '@tanstack/react-query';
import { Article } from '@youfoundation/js-lib/public';
import {
  ActionButton,
  ActionLink,
  Article as ArticleIcon,
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
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const ArticlesPage = () => {
  return (
    <>
      <PageMeta
        title={t('Articles')}
        icon={ArticleIcon}
        actions={
          <ActionLink onClick={() => (window.location.href = '/owner/feed/new')} icon={Plus}>
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
                  linkRoot="/owner/feed/edit"
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
};

const PAGE_SIZE = 30;
const PublishedArticlesView = () => {
  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });

  const {
    data: articleData,
    isLoading: articlesLoading,
    hasNextPage,
    fetchNextPage,
  } = useBlogPostsInfinite({
    postType: 'Article',
    pageSize: PAGE_SIZE,
  });

  const flattenedPosts = flattenInfinteData<DriveSearchResult<Article>>(
    articleData as InfiniteData<{
      results: DriveSearchResult<Article>[];
      cursorState: unknown;
    }>,
    PAGE_SIZE
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
