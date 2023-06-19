import { PostImageDetailCard, useBlog } from '@youfoundation/common-app';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useAuth from '../../../hooks/auth/useAuth';
import { useMemo } from 'react';

const PostImageDetail = () => {
  const { channelKey, postKey, attachmentKey } = useParams();
  const { data: blogData } = useBlog(
    channelKey && postKey
      ? {
          channelSlug: channelKey,
          blogSlug: postKey,
        }
      : undefined
  );

  const { isAuthenticated, isOwner } = useAuth();
  const location = useLocation();
  const state = location.state as Record<string, unknown> | undefined;
  const navigate = useNavigate();

  const rootUrl = useMemo(() => {
    const paths = window.location.pathname.split('/');
    paths.pop();
    return paths.join('/');
  }, [window.location.pathname]);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-page-background bg-opacity-90 backdrop-blur-sm">
      <PostImageDetailCard
        channel={blogData?.activeChannel}
        postFile={blogData?.activeBlog}
        attachmentKey={attachmentKey}
        onClose={() => navigate(state?.referrer || -1, { preventScrollReset: true })}
        navigate={(path: string) =>
          navigate(path, { state: location.state, preventScrollReset: true })
        }
        rootUrl={rootUrl}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};

export default PostImageDetail;
