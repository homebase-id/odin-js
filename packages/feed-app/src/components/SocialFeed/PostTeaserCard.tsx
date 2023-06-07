import { PostContent, Article, PostFile, getChannelDrive } from '@youfoundation/js-lib';
import { FC, useState } from 'react';
import {
  AuthorImage,
  AuthorName,
  FakeAnchor,
  PostInteracts,
  PostMeta,
  RichTextRenderer,
  useChannel,
  useSocialChannel,
  ellipsisAtMaxChar,
  t,
  ErrorBoundary,
} from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import DoubleClickHeartForMedia from './DoubleClickHeartForMedia';

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

  const [isExpanded, setIsExpanded] = useState(false);
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

              {/* Type specific content */}
              {post.type === 'Article' ? (
                <>
                  <h1 className={`text-foreground text-opacity-80 ${isExpanded ? 'text-2xl' : ''}`}>
                    {post.caption}
                  </h1>
                  <div className="leading-relaxed text-foreground text-opacity-70">
                    {isExpanded ? (
                      <div className="rich-text-content mb-5 leading-relaxed">
                        <RichTextRenderer
                          body={(post as Article)?.body}
                          imageDrive={getChannelDrive(post.channelId)}
                          odinId={odinId}
                        />
                      </div>
                    ) : (
                      ellipsisAtMaxChar((post as Article).abstract, 140)
                    )}

                    <>
                      {' '}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsExpanded(!isExpanded);
                        }}
                        className="text-primary hover:underline"
                      >
                        {isExpanded ? t('Less') : <>{t('More')}...</>}
                      </button>
                    </>
                  </div>
                </>
              ) : (
                <h1 className="text-foreground text-opacity-70">
                  {isExpanded || post.caption.length <= 140 ? (
                    post.captionAsRichText ? (
                      <RichTextRenderer
                        body={post.captionAsRichText}
                        odinId={odinId}
                        options={{ linksAlwaysBlank: true }}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{post.caption}</span>
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
