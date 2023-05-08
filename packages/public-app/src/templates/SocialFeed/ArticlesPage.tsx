import { PostContent, PostFile } from '@youfoundation/js-lib';
import { DraftItem } from '../../components/SocialFeed/DraftsDialog/DraftsDialog';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import ActionLink from '../../components/ui/Buttons/ActionLink';
import { Article, LoadingParagraph } from '@youfoundation/common-app';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { flattenInfinteData } from '../../helpers/common';
import { t } from '@youfoundation/common-app';
import useBlogPostsInfinite from '../../hooks/blog/useBlogPostsInfinite';
import useChannels from '../../hooks/blog/useChannels';
import useDrafts from '../../hooks/socialFeed/drafts/useDrafts';

const ArticlesPage = () => {
  return (
    <>
      <PageMeta title={t('Articles')} icon={Article} />

      <DraftsView />
      <PublishedArticlesView />
    </>
  );
};

const DraftsView = () => {
  const { data: drafts, isLoading: draftsLoading } = useDrafts().fetch;
  const { data: channels } = useChannels();

  return (
    <section className="pb-10">
      <div className="px-2 sm:px-10">
        <h2 className="mb-5 text-xl">{t('Drafts')}</h2>
        {draftsLoading ? (
          <>
            <LoadingParagraph className="my-2 h-4" />
            <LoadingParagraph className="my-2 h-4" />
            <LoadingParagraph className="my-2 h-4" />
          </>
        ) : null}
        {!drafts && !draftsLoading ? <>{t('No drafts found')}</> : null}
        {drafts ? (
          <div className="-m-3">
            {!drafts?.length ? (
              <p className="m-3">{t('No drafts found')}</p>
            ) : (
              drafts.map((draft, index) => {
                const channel = channels?.find(
                  (chnl) => chnl.channelId === draft.content.channelId
                );
                return (
                  <DraftItem
                    draft={draft}
                    channel={channel}
                    key={draft.fileId ?? index}
                    className="bg-background"
                  />
                );
              })
            )}
          </div>
        ) : null}
        <div className="-m-2 flex flex-row-reverse py-3">
          <ActionLink
            className="m-2 cursor-pointer"
            onClick={() => {
              window.location.href = '/home/feed/new';
            }}
            icon="plus"
          >
            {t('New Draft')}
          </ActionLink>
        </div>
      </div>
    </section>
  );
};

const PAGE_SIZE = 10;
const PublishedArticlesView = () => {
  const { data: channels } = useChannels();

  const {
    data: articleData,
    isLoading: articlesLoading,
    hasNextPage,
    fetchNextPage,
  } = useBlogPostsInfinite({
    postType: 'Article',
    pageSize: PAGE_SIZE,
  });

  const flattenedPosts = flattenInfinteData<PostFile<PostContent>>(articleData, PAGE_SIZE);
  console.log(flattenedPosts);
  return (
    <section className="pb-10">
      <div className="px-2 sm:px-10">
        <h2 className="mb-5 text-xl">{t('Published articles')}</h2>
        {articlesLoading ? (
          <>
            <LoadingParagraph className="my-2 h-4" />
            <LoadingParagraph className="my-2 h-4" />
            <LoadingParagraph className="my-2 h-4" />
          </>
        ) : null}
        {!articleData && !articlesLoading ? <>{t('No articles found')}</> : null}
        {articleData ? (
          <div className="-m-3">
            {!flattenedPosts.length ? (
              <p className="m-3">{t('No articles found')}</p>
            ) : (
              flattenedPosts.map((draft, index) => {
                const channel = channels?.find(
                  (chnl) => chnl.channelId === draft.content.channelId
                );
                return (
                  <DraftItem
                    draft={draft}
                    channel={channel}
                    key={draft.fileId ?? index}
                    className="bg-background"
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
