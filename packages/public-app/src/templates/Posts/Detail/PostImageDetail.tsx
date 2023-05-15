import { PostImageDetailCard, useBlog } from '@youfoundation/common-app';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useAuth from '../../../hooks/auth/useAuth';

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

  const paths = window.location.pathname.split('/');
  paths.pop();
  const rootUrl = paths.join('/');

  return (
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
  );
};

export default PostImageDetail;
