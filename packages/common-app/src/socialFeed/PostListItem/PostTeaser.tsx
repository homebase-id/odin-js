import { PostContent, PostFile } from '@youfoundation/js-lib/public';
import { FC } from 'react';
import {
  ErrorBoundary,
  FakeAnchor,
  HOME_ROOT_PATH,
  PostBody,
  PostInteracts,
  useDotYouClient,
} from '@youfoundation/common-app';
import { useChannel } from '@youfoundation/common-app';
import { PostMeta } from '../Blocks/Meta/Meta';
import { DoubleClickHeartForMedia } from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { SecurityGroupType } from '@youfoundation/js-lib/core';

interface PostTeaserProps {
  className?: string;
  postFile: PostFile<PostContent>;
  hideImageWhenNone?: boolean;
  showChannel?: boolean;
  forceAspectRatio?: boolean;
  allowExpand?: boolean;
  hideEmbeddedPostMedia?: boolean;
  login?: () => void;
}

export const PostTeaser: FC<PostTeaserProps> = ({
  className,
  postFile,
  hideImageWhenNone,
  showChannel,
  forceAspectRatio,
  allowExpand,
  hideEmbeddedPostMedia,
  login,
}) => {
  const { content: post } = postFile;
  const { data: channel } = useChannel({ channelId: post.channelId }).fetch;
  const { isOwner, getIdentity } = useDotYouClient();
  const navigate = useNavigate();
  const isAuthenticated = !!getIdentity();
  // Compared to PostTeaserCard, this one is always clickable as comments can't be loaded within;
  //   If there is any media linked and not an article, we load the blogImageDetailPage
  const postPath = `${HOME_ROOT_PATH}posts/${channel ? channel.slug : 'public-posts'}/${
    post.slug ?? post.id
  }`;
  const targetPath = `${postPath}${
    post.type !== 'Article' && post.primaryMediaFile?.fileId ? '/0' : ''
  }`;

  return (
    <div className={`w-full ${className ?? ''}`}>
      <FakeAnchor href={targetPath}>
        <ErrorBoundary>
          <div
            className={`relative h-full rounded-lg border border-gray-200 border-opacity-60 transition-colors ${'hover:shadow-md hover:dark:shadow-slate-600'} bg-background dark:border-gray-800`}
          >
            <DoubleClickHeartForMedia
              postFile={postFile}
              showFallback={!hideImageWhenNone}
              forceAspectRatio={forceAspectRatio}
              onClick={(e, index) => {
                e.stopPropagation();

                // Only navigate to the article if we're on desktop
                if (post.type !== 'Article') {
                  navigate(`${postPath}/${index}`, {
                    state: { referrer: window.location.pathname },
                  });
                } else navigate(postPath, { state: { referrer: window.location.pathname } });
              }}
            />
            <div className="p-4">
              <div className="text-foreground flex flex-row text-opacity-40">
                {channel && post ? (
                  <PostMeta postFile={postFile} channel={showChannel ? channel : undefined} />
                ) : null}
              </div>

              <PostBody
                post={post}
                hideEmbeddedPostMedia={hideEmbeddedPostMedia}
                fileId={postFile.fileId}
                globalTransitId={postFile.globalTransitId}
              />
            </div>
            <PostInteracts
              authorOdinId={window.location.hostname}
              postFile={postFile}
              allowExpand={!!allowExpand}
              className="px-4"
              showSummary={true}
              isOwner={isOwner}
              isAuthenticated={isAuthenticated}
              isPublic={
                channel?.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous ||
                channel?.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated
              }
              login={login}
            />
          </div>
        </ErrorBoundary>
      </FakeAnchor>
    </div>
  );
};
