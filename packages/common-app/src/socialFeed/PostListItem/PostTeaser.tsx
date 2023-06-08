import { Article, getChannelDrive, PostContent, PostFile } from '@youfoundation/js-lib/public';
import { FC, useState } from 'react';
import {
  ErrorBoundary,
  FakeAnchor,
  PostInteracts,
  RichTextRenderer,
  t,
  useDotYouClient,
} from '@youfoundation/common-app';
import { useChannel } from '@youfoundation/common-app';
import { ellipsisAtMaxChar } from '@youfoundation/common-app';
import { PostMeta } from '../Blocks/Meta/Meta';
import { PostMedia } from '../Blocks/Media/Media';

interface PostTeaserProps {
  className?: string;
  postFile: PostFile<PostContent>;
  hideImageWhenNone?: boolean;
  showChannel?: boolean;
  forceAspectRatio?: boolean;
  allowExpand?: boolean;
}

export const PostTeaser: FC<PostTeaserProps> = ({
  className,
  postFile,
  hideImageWhenNone,
  showChannel,
  forceAspectRatio,
  allowExpand,
}) => {
  const { content: post } = postFile;
  const { data: channel } = useChannel({ channelId: post.channelId }).fetch;
  const { isOwner } = useDotYouClient();

  const [isExpanded, setIsExpanded] = useState(false);

  // Compared to PostTeaserCard, this one is always clickable as comments can't be loaded within;
  //   If there is any media linked and not an article, we load the blogImageDetailPage
  const postPath = `/home/posts/${channel ? channel.slug : 'public-posts'}/${post.slug ?? post.id}`;
  const imagePath = `${postPath}${
    post.type !== 'Article' && post.primaryMediaFile?.fileId ? '/0' : ''
  }`;

  return (
    <div className={`w-full ${className ?? ''}`}>
      <ErrorBoundary>
        <FakeAnchor href={imagePath} className="contents">
          <div
            className={`relative h-full rounded-lg border border-gray-200 border-opacity-60 transition-colors ${'hover:shadow-md hover:dark:shadow-slate-600'} bg-background dark:border-gray-800`}
          >
            <PostMedia
              postFile={postFile}
              postPath={postPath}
              showFallback={!hideImageWhenNone}
              forceAspectRatio={forceAspectRatio}
            />

            <div className="px-4 pb-4">
              <div className="text-foreground flex flex-row text-opacity-40">
                {channel && post ? (
                  <PostMeta postFile={postFile} channel={channel} excludeChannel={!showChannel} />
                ) : null}
              </div>

              {/* Type specific content */}
              {post.type === 'Article' ? (
                <>
                  <h1 className={`text-foreground text-opacity-80 ${isExpanded ? 'text-2xl' : ''}`}>
                    {post.caption}
                  </h1>
                  <div className="text-foreground leading-relaxed text-opacity-70">
                    {isExpanded ? (
                      <div className="rich-text-content mb-5 leading-relaxed">
                        <RichTextRenderer
                          body={(post as Article)?.body}
                          imageDrive={getChannelDrive(post.channelId)}
                        />
                      </div>
                    ) : (
                      ellipsisAtMaxChar((post as Article).abstract, 140)
                    )}
                    {!isExpanded ? (
                      <>
                        {' '}
                        <button
                          onClick={(e) => {
                            if (allowExpand) {
                              e.stopPropagation();
                              setIsExpanded(true);
                            }
                          }}
                          className="text-primary hover:underline"
                        >
                          {t('More')}...
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <h1 className="text-foreground text-opacity-70">
                  {isExpanded || post.caption.length <= 140 ? (
                    post.captionAsRichText ? (
                      <RichTextRenderer
                        body={post.captionAsRichText}
                        options={{ linksAlwaysBlank: true }}
                      />
                    ) : (
                      post.caption
                    )
                  ) : (
                    <>
                      {ellipsisAtMaxChar(post.caption, 140)}{' '}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(true);
                        }}
                        className="text-primary hover:underline"
                      >
                        {t('More')}...
                      </button>
                    </>
                  )}
                </h1>
              )}
            </div>
            <PostInteracts
              authorOdinId={window.location.hostname}
              postFile={postFile}
              allowExpand={!!allowExpand}
              className="px-4"
              showSummary={true}
              isOwner={isOwner}
            />
          </div>
        </FakeAnchor>
      </ErrorBoundary>
    </div>
  );
};
