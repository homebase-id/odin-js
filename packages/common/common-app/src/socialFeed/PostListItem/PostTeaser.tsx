import { BlogConfig, PostContent } from '@homebase-id/js-lib/public';
import { FC } from 'react';
import { PostMeta } from '../Blocks/Meta/Meta';
import { useNavigate } from 'react-router-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { FakeAnchor, ErrorBoundary } from '../../ui';
import { AuthorImage } from '../Blocks/Author/AuthorImage';
import { AuthorName } from '../Blocks/Author/AuthorName';
import { PostBody } from '../Blocks/Body/Body';
import { PostInteracts } from '../Blocks/Interacts/PostInteracts';
import { DoubleClickHeartForMedia } from '../Blocks/Media/DoubleClickHeartForMedia';
import { useChannel } from '../../hooks/socialFeed/channels/useChannel';
import { HOME_ROOT_PATH } from '../../constants';
import { useOdinClientContext } from '../../hooks';
import { PostSource } from '../Blocks/Meta/PostSource';

interface PostTeaserProps {
  className?: string;
  postFile: HomebaseFile<PostContent>;
  hideImageWhenNone?: boolean;
  showChannel?: boolean;
  forceAspectRatio?: boolean;
  allowExpand?: boolean;
  hideEmbeddedPostMedia?: boolean;
  login?: () => void;
  showAuthor?: boolean;
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
  showAuthor,
}) => {
  const post = postFile.fileMetadata.appData.content;
  const { data: channel } = useChannel({ channelKey: post.channelId }).fetch;
  const odinClient = useOdinClientContext();
  const isOwner = odinClient.isOwner();
  const isAuthenticated = odinClient.isAuthenticated();
  const navigate = useNavigate();
  // Compared to PostTeaserCard, this one is always clickable as comments can't be loaded within;
  //   If there is any media linked and not an article, we load the blogImageDetailPage
  const postPath = `${HOME_ROOT_PATH}posts/${
    channel ? channel.fileMetadata.appData.content.slug : BlogConfig.PublicChannelSlug
  }/${post.slug ?? post.id}`;
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
            <PostSource postFile={postFile} className="rounded-t-lg" />
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
              <div className="text-foreground/60 flex flex-row items-center">
                {showAuthor ? (
                  <>
                    <AuthorImage
                      odinId={postFile.fileMetadata.originalAuthor}
                      className="h-10 w-10 rounded-full sm:h-12 sm:w-12 md:h-[2rem] md:w-[2rem]"
                    />
                    <h2 className="ml-2">
                      <AuthorName odinId={postFile.fileMetadata.originalAuthor} />
                    </h2>
                    <span className="hidden px-2 leading-4 md:block">·</span>
                  </>
                ) : null}

                {channel && post ? (
                  <PostMeta
                    postFile={postFile}
                    channel={showChannel ? channel : undefined}
                    authorOdinId={postFile.fileMetadata.originalAuthor}
                  />
                ) : null}
              </div>

              <PostBody
                post={post}
                hideEmbeddedPostMedia={hideEmbeddedPostMedia}
                fileId={postFile.fileId}
                globalTransitId={postFile.fileMetadata.globalTransitId}
                lastModified={postFile.fileMetadata.updated}
                payloads={postFile.fileMetadata.payloads}
              />
            </div>
            <PostInteracts
              odinId={window.location.hostname}
              postFile={postFile}
              allowExpand={!!allowExpand}
              className="px-4"
              showSummary={true}
              isOwner={isOwner}
              isAuthenticated={isAuthenticated}
              login={login}
            />
          </div>
        </ErrorBoundary>
      </FakeAnchor>
    </div>
  );
};
