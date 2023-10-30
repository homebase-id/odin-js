import { PostContent, PostFile } from '@youfoundation/js-lib/public';
import { FC } from 'react';
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
import { SecurityGroupType } from '@youfoundation/js-lib/core';
import { useAuth } from '../../hooks/auth/useAuth';
interface PostTeaserCardProps {
  className?: string;
  postFile: PostFile<PostContent>;
  odinId?: string;
  showSummary?: boolean;
}

const PostTeaserCard: FC<PostTeaserCardProps> = ({ className, odinId, postFile, showSummary }) => {
  const { getDotYouClient } = useAuth();
  const { content: post } = postFile;
  const isExternal = odinId !== getDotYouClient().getIdentity();
  const navigate = useNavigate();

  const { data: externalChannel } = useSocialChannel({
    odinId: isExternal ? odinId : undefined,
    channelId: post.channelId,
  }).fetch;
  const { data: internalChannel } = useChannel({
    channelId: isExternal ? undefined : post.channelId,
  }).fetch;

  const channel = externalChannel || internalChannel;
  const postPath = `preview/${odinId}/${channel?.channelId}/${post.id}`;
  const clickable = post.type === 'Article'; // Post is only clickable if it's an article; While media posts are clickable only on the media itself

  return (
    <div className={`w-full break-words rounded-lg ${className ?? ''}`}>
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
          <div className="flex flex-row gap-4 px-3 py-3 sm:px-4">
            <div className="flex-shrink-0 py-1">
              <AuthorImage
                odinId={odinId}
                className="h-10 w-10 rounded-full sm:h-12 sm:w-12 md:h-[4rem] md:w-[4rem]"
              />
            </div>
            <div className="flex flex-grow flex-col">
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
            // Clicks don't propogate to the parent container because of the Double Tap listener
            onClick={(e, index) => {
              if (post.type !== 'Article')
                navigate(`${postPath}/${index}`, { state: { referrer: window.location.pathname } });
              else navigate(postPath, { state: { referrer: window.location.pathname } });
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
            isPublic={
              channel?.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
              channel?.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
            }
          />
        </FakeAnchor>
      </ErrorBoundary>
    </div>
  );
};

export default PostTeaserCard;
