import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ActionButton } from '@youfoundation/common-app';
import {
  ArrowLeft,
  PostDetailCard,
  PostImageDetailCard,
  useBlog,
  useOutsideTrigger,
  useSocialChannel,
} from '@youfoundation/common-app';
import useSocialPost from '@youfoundation/common-app/src/hooks/socialFeed/useSocialPost';

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
  const isLocal = identityKey === window.location.hostname;

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

  const navigate = useNavigate();
  const doClose = () => navigate('/owner/feed', { preventScrollReset: true });
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

  const location = useLocation();
  const state = location.state as Record<string, unknown> | undefined;

  const paths = window.location.pathname.split('/');
  paths.pop();
  const rootUrl = paths.join('/');

  return (
    <>
      {attachmentKey ? (
        <PostImageDetailCard
          odinId={identityKey}
          channel={externalChannel || localChannel}
          postFile={externalPost || localPost}
          isOwner={false} // PostPreview only used for non owner posts
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
            <h2 className="ml-2 text-lg lg:hidden">{(externalPost || localPost)?.content.type}</h2>
          </div>

          <PostDetailCard
            odinId={identityKey}
            channel={externalChannel || localChannel}
            postFile={externalPost || localPost}
            showAuthorDetail={true}
            className="mb-5 lg:my-10"
            isOwner={false} // PostPreview only used for non owner posts
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
    </>
  );
};

export default PostPreview;
