import { useParams } from 'react-router-dom';
import { Article, useBlog } from '@youfoundation/common-app';
import { PageMeta } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import ArticleComposer from '../../components/SocialFeed/ArticleComposer/ArticleComposer';

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
