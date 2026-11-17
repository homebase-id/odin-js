import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArticleReader,
  HOME_ROOT_PATH,
  PostDetailCard,
  RelatedArticles,
  t,
  useChannel,
  useDotYouClientContext,
  usePost,
} from '@homebase-id/common-app';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';
import { Article } from '@homebase-id/js-lib/public';
import { useState } from 'react';
import LoginDialog from '../../../components/Dialog/LoginDialog/LoginDialog';
import { SiteNav } from '../../../components/ui/Layout/Header/Header';

const PostDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { channelKey, postKey } = useParams();
  const { data: channel } = useChannel({ channelKey }).fetch;
  const { data: postData, isLoading: postDataLoading } = usePost({
    channelKey,
    postKey,
  });

  const dotYouClient = useDotYouClientContext();
  const isOwner = dotYouClient.isOwner();
  const isAuthenticated = dotYouClient.isAuthenticated();
  const [isLogin, setIsLogin] = useState(false);

  if (!postData && !postDataLoading) {
    return (
      <section className="py-5">
        <div className="container mx-auto mb-10 px-5">{t('No post found')}</div>
      </section>
    );
  }

  const post = postData?.fileMetadata.appData.content;

  if (postData && post?.type === 'Article') {
    const state = location.state as Record<string, unknown> | undefined;
    return (
      <>
        <Helmet>
          <title>
            {post.caption || channel?.fileMetadata.appData.content.name || ''} | Homebase
          </title>
          <meta name="og:title" content={post.caption ?? ''} />
          <meta name="og:description" content={(post as Article).abstract ?? ''} />
        </Helmet>

        <ArticleReader
          channel={channel || undefined}
          postFile={postData}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          onBack={() => {
            const referrer = state?.referrer as string | undefined;
            if (referrer) navigate(referrer);
            // The first page of the visit has no page of the site to go back to
            else if (location.key !== 'default') navigate(-1);
            else navigate(HOME_ROOT_PATH);
          }}
          login={() => setIsLogin(true)}
          barEnd={<SiteNav />}
        />
        {/* On the reader's paper too, so no strip of the site's background shows below the article */}
        <div className="article-page">
          <RelatedArticles blog={postData} channel={channel || undefined} onPaper />
        </div>

        <LoginDialog
          isOpen={isLogin}
          onCancel={() => setIsLogin(false)}
          title={t('Login required')}
          returnPath={window.location.pathname}
        />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${post?.caption || channel?.fileMetadata.appData.content.name || ''} | Homebase`}</title>
        <meta name="og:title" content={post?.caption ?? ''} />
        <meta
          name="og:description"
          content={post?.type === 'Article' ? ((post as Article).abstract ?? '') : ''}
        />
      </Helmet>

      <section className="py-5">
        <div className="mx-auto mb-10 max-w-3xl sm:px-5 lg:w-2/3">
          <Breadcrumbs
            levels={[
              { title: t('Posts') ?? '', href: `${HOME_ROOT_PATH}posts` },
              {
                title: channel?.fileMetadata.appData.content.name ?? '',
                href: `${HOME_ROOT_PATH}posts/${channel?.fileMetadata.appData.content.slug}`,
              },
              { title: post?.caption ?? '' },
            ]}
            className="text-sm"
          />
          <PostDetailCard
            channel={channel || undefined}
            postFile={postData || undefined}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            onNavigate={(path: string) => navigate(path)}
            login={() => setIsLogin(true)}
            showAuthorDetail={channel?.fileMetadata.appData.content.isCollaborative}
          />
        </div>
      </section>
      <div className="container mx-auto sm:px-5">
        {postData?.fileMetadata.appData.content.type === 'Article' && (
          <RelatedArticles blog={postData} channel={channel || undefined} />
        )}
      </div>

      <LoginDialog
        isOpen={isLogin}
        onCancel={() => setIsLogin(false)}
        title={t('Login required')}
        returnPath={window.location.pathname}
      />
    </>
  );
};

export default PostDetail;
