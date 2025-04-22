import {
  PostImageDetailCard,
  t,
  useChannel,
  useOdinClientContext,
  usePost,
} from '@homebase-id/common-app';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import LoginDialog from '../../../components/Dialog/LoginDialog/LoginDialog';

const PostImageDetail = () => {
  const { channelKey, postKey, attachmentKey } = useParams();
  const { data: channel } = useChannel({ channelKey }).fetch;
  const { data: postData } = usePost({
    channelKey,
    postKey,
  });

  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();
  const [isLogin, setIsLogin] = useState(false);
  const location = useLocation();
  const state = location.state as Record<string, unknown> | undefined;
  const navigate = useNavigate();

  const rootUrl = useMemo(() => {
    const paths = window.location.pathname.split('/');
    paths.pop();
    return paths.join('/');
  }, [window.location.pathname]);

  const post = postData?.fileMetadata.appData.content;

  return (
    <>
      <Helmet>
        <title>
          {post?.caption || channel?.fileMetadata.appData.content.name || ''} | Homebase
        </title>
        <meta name="og:title" content={post?.caption ?? ''} />
      </Helmet>
      <div className="absolute inset-0 z-40 bg-page-background bg-opacity-90 backdrop-blur-sm lg:fixed lg:overflow-hidden">
        <PostImageDetailCard
          channel={channel || undefined}
          postFile={postData || undefined}
          attachmentKey={attachmentKey}
          onClose={() => navigate(state?.referrer || -1, { preventScrollReset: true })}
          navigate={(path: string) =>
            navigate(path, { state: location.state, preventScrollReset: true })
          }
          rootUrl={rootUrl}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          login={() => setIsLogin(true)}
        />
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

export default PostImageDetail;
