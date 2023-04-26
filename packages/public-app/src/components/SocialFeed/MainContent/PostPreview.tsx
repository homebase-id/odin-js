import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useBlog from '../../../hooks/blog/useBlog';
import useOutsideTrigger from '../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import useSocialChannel from '../../../hooks/socialFeed/useSocialChannel';
import useSocialPost from '../../../hooks/socialFeed/useSocialPost';
import { PostDetailCard } from '../../../templates/Posts/Detail/PostDetail';
import { PostImageDetailCard } from '../../../templates/Posts/Detail/PostImageDetail';
import ActionButton from '../../ui/Buttons/ActionButton';
import { ArrowLeft } from '../../ui/Icons/Arrow/Arrow';

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
  const doClose = () => {
    navigate('/home/feed', { preventScrollReset: true });
  };

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

  return (
    <>
      {attachmentKey ? (
        <PostImageDetailCard
          odinId={identityKey}
          channel={externalChannel || localChannel}
          postFile={externalPost || localPost}
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
          />
        </div>
      )}
    </>
  );
};

export default PostPreview;
