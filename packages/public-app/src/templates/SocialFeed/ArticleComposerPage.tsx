import { useParams } from 'react-router-dom';
import ArticleComposer from '../../components/SocialFeed/ArticleComposer/ArticleComposer';
import { Article } from '@youfoundation/common-app';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { t } from '../../helpers/i18n/dictionary';
import useBlog from '../../hooks/blog/useBlog';

const ArticleComposerPage = () => {
  const { channelKey, postKey } = useParams();

  const { data: postData, isLoading: postDataLoading } = useBlog({
    channelSlug: channelKey,
    channelId: channelKey,
    blogSlug: postKey,
  });

  return (
    <>
      <PageMeta
        title={t('Articles')}
        icon={Article}
        breadCrumbs={[
          { title: t('Articles'), href: '/home/feed/articles' },
          { title: postData?.activeBlog?.content?.caption || t('New article') },
        ]}
      />
      <section className="pb-10">
        <div className="sm:px-10">
          {postKey ? (
            !postData && !postDataLoading ? (
              <>{t('No post found')}</>
            ) : postDataLoading ? (
              <>{t('Loading')}</>
            ) : (
              <ArticleComposer postFile={postData?.activeBlog} channel={postData?.activeChannel} />
            )
          ) : (
            <ArticleComposer />
          )}
        </div>
      </section>
    </>
  );
};

export default ArticleComposerPage;
