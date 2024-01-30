import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ActionButton, useDotYouClient } from '@youfoundation/common-app';
import {
  ArrowLeft,
  PostDetailCard,
  PostImageDetailCard,
  useBlog,
  useOutsideTrigger,
  useSocialChannel,
} from '@youfoundation/common-app';
import { useSocialPost } from '@youfoundation/common-app';

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
  const { isOwner, getIdentity } = useDotYouClient();
  const isLocal = identityKey === getIdentity();

  const { data: externalChannel } = useSocialChannel({
    odinId: !isLocal ? identityKey : undefined,
    channelId: channelKey,
  }).fetch;

  const { data: externalPost } = useSocialPost({
    odinId: !isLocal ? identityKey : undefined,
    channelId: channelKey,
    postId: postKey,
  }).fetch;

  const { data: localBlogData } = useBlog({
    channelId: channelKey,
    blogSlug: isLocal ? postKey : undefined,
  });
  const localChannel = localBlogData?.activeChannel;
  const localPost = localBlogData?.activeBlog;

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

  return (
    <div
      className={`fixed inset-0 z-40 overflow-auto bg-page-background bg-opacity-90 backdrop-blur-sm lg:overflow-hidden`}
    >
      {attachmentKey ? (
        <PostImageDetailCard
          odinId={identityKey}
          channel={externalChannel || localChannel}
          postFile={externalPost || localPost}
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
            <h2 className="ml-2 text-lg lg:hidden">
              {(externalPost || localPost)?.fileMetadata.appData.content.type}
            </h2>
          </div>

          <PostDetailCard
            odinId={identityKey}
            channel={externalChannel || localChannel}
            postFile={externalPost || localPost}
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
