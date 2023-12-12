import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  HOME_ROOT_PATH,
  PostDetailCard,
  RelatedArticles,
  t,
  useBlog,
} from '@youfoundation/common-app';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';

import { useAuth } from '../../../hooks/auth/useAuth';
import { Article } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import LoginDialog from '../../../components/Dialog/LoginDialog/LoginDialog';

const PostDetail = () => {
  const navigate = useNavigate();
  const { channelKey, postKey } = useParams();
  const { data: postData, isLoading: postDataLoading } = useBlog(
    channelKey && postKey
      ? {
          channelSlug: channelKey,
          channelId: channelKey,
          blogSlug: postKey,
        }
      : undefined
  );

  const { isOwner, isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(false);

  if (!postData && !postDataLoading) {
    return (
      <section className="py-5">
        <div className="container mx-auto mb-10 px-5">{t('No post found')}</div>
      </section>
    );
  }

  const post = postData?.activeBlog.fileMetadata.appData.content;
  const channel = postData?.activeChannel;
  return (
    <>
      <Helmet>
        <title>
          {post?.caption || channel?.fileMetadata.appData.content.name || ''} | Homebase
        </title>
        <meta name="og:title" content={post?.caption ?? ''} />
        <meta
          name="og:description"
          content={post?.type === 'Article' ? (post as Article).abstract ?? '' : ''}
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
            channel={channel}
            postFile={postData?.activeBlog}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            onNavigate={(path: string) => navigate(path)}
            login={() => setIsLogin(true)}
          />
        </div>
      </section>
      <div className="container mx-auto sm:px-5">
        {postData?.activeBlog.fileMetadata.appData.content.type === 'Article' && (
          <RelatedArticles blog={postData.activeBlog} channel={channel} />
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
