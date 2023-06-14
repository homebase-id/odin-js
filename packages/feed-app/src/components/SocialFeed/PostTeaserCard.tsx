import { PostContent, Article, PostFile, getChannelDrive } from '@youfoundation/js-lib/public';
import { FC, useState } from 'react';
import {
  AuthorImage,
  AuthorName,
  FakeAnchor,
  PostInteracts,
  PostMeta,
  useChannel,
  useSocialChannel,
  ErrorBoundary,
  PostBody,
} from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { DoubleClickHeartForMedia } from '@youfoundation/common-app';
interface PostTeaserCardProps {
  className?: string;
  postFile: PostFile<PostContent>;
  odinId?: string;
  showSummary?: boolean;
}

const PostTeaserCard: FC<PostTeaserCardProps> = ({ className, odinId, postFile, showSummary }) => {
  const { content: post } = postFile;
  const isExternal = !odinId || odinId !== window.location.hostname;
  const navigate = useNavigate();

  const { data: externalChannel } = useSocialChannel({
    odinId: isExternal ? odinId : undefined,
    channelId: post.channelId,
  }).fetch;
  const { data: internalChannel } = useChannel({ channelId: post.channelId }).fetch;

  const channel = externalChannel || internalChannel;

  const postPath = `preview/${odinId}/${channel?.channelId}/${post.id}`;
  const clickable = post.type === 'Article'; // Post is only clickable if it's an article; While media posts are clickable only on the media itself
  const isDesktop = document.documentElement.clientWidth >= 1024;

  return (
    <div className={`w-full rounded-lg ${className ?? ''}`}>
      <ErrorBoundary>
        <FakeAnchor
          href={clickable ? postPath : undefined}
          target="__blank"
          rel="nofollow noreferrer"
          preventScrollReset={true}
          className={`relative flex h-full flex-col rounded-lg border-gray-200 border-opacity-60 transition-colors ${
            clickable ? 'hover:shadow-md hover:dark:shadow-slate-600' : ''
          } dark:border-gray-800 lg:border`}
        >
          <div className="flex flex-row">
            <div className="flex-shrink-0 py-4 pl-4">
              <AuthorImage
                odinId={odinId}
                className="h-[3rem] w-[3rem] rounded-full sm:h-[5rem] sm:w-[5rem]"
              />
            </div>
            <div className="flex flex-grow flex-col px-4 py-3">
              <div className="mb-1 flex flex-col text-foreground text-opacity-60 md:flex-row md:flex-wrap md:items-center">
                <h2>
                  <AuthorName odinId={odinId} />
                </h2>
                <span className="hidden px-2 leading-4 md:block">·</span>
                {channel && post ? (
                  <PostMeta postFile={postFile} channel={channel} odinId={odinId} />
                ) : null}
              </div>

              <PostBody post={post} odinId={odinId} />
            </div>
          </div>
          <DoubleClickHeartForMedia
            odinId={odinId}
            postFile={postFile}
            postPath={postPath}
            onClick={(e, index) => {
              e.stopPropagation();

              // Only navigate to the article if we're on desktop
              if (post.type !== 'Article') {
                navigate(`${postPath}/${index}`, { state: { referrer: window.location.pathname } });
                return;
              }

              if (isDesktop) navigate(postPath, { state: { referrer: window.location.pathname } });
            }}
            className="mb-4"
          />
          <PostInteracts
            authorOdinId={odinId || window.location.hostname}
            postFile={postFile}
            className="px-4"
            showSummary={showSummary}
            isAuthenticated={true}
            isOwner={true}
          />
        </FakeAnchor>
      </ErrorBoundary>
    </div>
  );
};

export default PostTeaserCard;
