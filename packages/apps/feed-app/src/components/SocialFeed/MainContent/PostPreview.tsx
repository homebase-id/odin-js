import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ActionButton, NotFound, useChannel, useOdinClientContext } from '@homebase-id/common-app';
import {
  PostDetailCard,
  PostImageDetailCard,
  usePost,
  useOutsideTrigger,
} from '@homebase-id/common-app';
import { ArrowLeft } from '@homebase-id/common-app/icons';

const PostPreview = ({
  identityKey,
  channelKey,
  postKey,
  attachmentKey,
}: {
  identityKey: string;
  channelKey: string;
  postKey: string;
  attachmentKey?: string;
}) => {
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();

  const isLocal = identityKey === odinClient.getHostIdentity();

  const { data: channel } = useChannel({
    odinId: !isLocal ? identityKey : undefined,
    channelKey: channelKey,
  }).fetch;

  const { data: post, isFetched: fetchedPost } = usePost({
    odinId: !isLocal ? identityKey : undefined,
    channelKey: channelKey,
    postKey: postKey,
  });

  const location = useLocation();
  const state = location.state as Record<string, unknown> | undefined;

  const navigate = useNavigate();
  const doClose = () => navigate(state?.referrer || -1, { preventScrollReset: true }); //, { preventScrollReset: true });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        doClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => doClose());

  const paths = window.location.pathname.split('/');
  paths.pop();
  const rootUrl = paths.join('/');

  if (fetchedPost && !post) return <NotFound />;

  return (
    <div
      className={`fixed inset-0 z-40 overflow-auto bg-page-background bg-opacity-90 backdrop-blur-sm ${attachmentKey ? 'lg:overflow-hidden' : ''}`}
    >
      {attachmentKey ? (
        <PostImageDetailCard
          odinId={identityKey}
          channel={channel || undefined}
          postFile={post || undefined}
          isOwner={isOwner}
          isAuthenticated={true}
          attachmentKey={attachmentKey}
          onClose={() => navigate(state?.referrer || -1, { preventScrollReset: true })}
          navigate={(path: string) =>
            navigate(path, { state: location.state, preventScrollReset: true })
          }
          rootUrl={rootUrl}
        />
      ) : (
        <div className="mx-auto max-w-3xl lg:w-2/3" ref={wrapperRef}>
          <div className="flex w-full flex-row items-center py-2 lg:py-0">
            <ActionButton
              icon={ArrowLeft}
              onClick={doClose}
              className="left-2 top-2 rounded-full p-3 lg:fixed"
              size="square"
            />
            <h2 className="ml-2 text-lg lg:hidden">{post?.fileMetadata.appData.content.type}</h2>
          </div>

          <PostDetailCard
            odinId={identityKey}
            channel={channel || undefined}
            postFile={post || undefined}
            showAuthorDetail={true}
            className="mb-5 lg:my-10"
            isOwner={isOwner}
            isAuthenticated={true}
            onNavigate={(path: string) =>
              navigate(path, {
                state: { referrer: window.location.pathname },
                preventScrollReset: true,
              })
            }
          />
        </div>
      )}
    </div>
  );
};

export default PostPreview;
