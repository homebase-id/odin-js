import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PostDetailCard, RelatedArticles, t, useBlog } from '@youfoundation/common-app';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';

import useAuth from '../../../hooks/auth/useAuth';

const PostDetail = () => {
  const navigate = useNavigate();
  const { channelKey, postKey } = useParams();
  const { data: postData, isLoading: postDataLoading } = useBlog(
    channelKey && postKey
      ? {
          channelSlug: channelKey,
          blogSlug: postKey,
        }
      : undefined
  );

  const { isOwner, isAuthenticated } = useAuth();

  if (!postData && !postDataLoading) {
    return (
      <section className="py-5">
        <div className="container mx-auto mb-10 px-5">{t('No post found')}</div>
      </section>
    );
  }

  const post = postData?.activeBlog.content;
  const channel = postData?.activeChannel;

  return (
    <>
      <Helmet>
        <title>{post?.caption ?? ''} | Odin</title>
      </Helmet>

      <section className="py-5">
        <div className="mx-auto mb-10 max-w-3xl sm:px-5 lg:w-2/3">
          <Breadcrumbs
            levels={[
              { title: t('Posts') ?? '', href: `/home/posts` },
              { title: channel?.name ?? '', href: `/home/posts/${channel?.slug}` },
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
          />
        </div>
      </section>
      <div className="container mx-auto sm:px-5">
        {postData?.activeBlog?.content?.type === 'Article' && (
          <RelatedArticles blog={postData?.activeBlog} channel={channel} />
        )}
      </div>
    </>
  );
};

export default PostDetail;
