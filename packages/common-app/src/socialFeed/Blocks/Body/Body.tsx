import { Article, EmbeddedPost, PostContent, getChannelDrive } from '@youfoundation/js-lib/public';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ellipsisAtMaxChar, t } from '../../../helpers';
import { RichTextRenderer } from '../../../richText';
import { AuthorImage } from '../Author/Image';
import { AuthorName } from '../Author/Name';
import { PostMedia } from '../Media/Media';
import { PostMeta } from '../Meta/Meta';
import { useSocialChannel, useChannel } from '../../../hooks';
import { FakeAnchor } from '../../../ui';
import { SecurityGroupType } from '@youfoundation/js-lib/core';

export const PostBody = ({
  post,
  odinId,
  hideEmbeddedPostMedia,
}: {
  post: PostContent;
  odinId?: string;
  hideEmbeddedPostMedia?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
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

      {post.embeddedPost ? (
        <EmbeddedPostContent
          content={post.embeddedPost}
          hideMedia={hideEmbeddedPostMedia}
          className="mt-3"
        />
      ) : null}
    </>
  );
};

export const EmbeddedPostContent = ({
  content,
  className,
  hideMedia,
}: {
  content: EmbeddedPost;
  className?: string;
  hideMedia?: boolean;
}) => {
  const navigate = useNavigate();
  const isDesktop = document.documentElement.clientWidth >= 1024;

  const [shouldHideMedia, setShouldHideMedia] = useState(hideMedia);
  const isExternal = !content.authorOdinId || content.authorOdinId !== window.location.hostname;

  const { data: externalChannel, status: externalChannelStatus } = useSocialChannel({
    odinId: isExternal ? content.authorOdinId : undefined,
    channelId: content.channelId,
  }).fetch;
  const { data: internalChannel, status: internalChannelStatus } = useChannel({
    channelId: content.channelId,
  }).fetch;

  const channel = externalChannel || internalChannel;

  // Hide media if we can't get channel info, when there's no channel we can't get the media either
  useEffect(() => {
    if (externalChannelStatus !== 'loading' && internalChannelStatus !== 'loading' && !channel)
      setShouldHideMedia(true);
  }, [externalChannel, internalChannel, externalChannelStatus, internalChannelStatus]);

  // When on the feed use the preview link
  const postPath =
    window.location.pathname === '/owner/feed'
      ? `preview/${content.authorOdinId}/${channel?.channelId}/${content.id}`
      : content.permalink;

  const isChannelPublic =
    channel?.acl?.requiredSecurityGroup === SecurityGroupType.Authenticated ||
    channel?.acl?.requiredSecurityGroup === SecurityGroupType.Anonymous;

  return (
    <div className={`overflow-hidden rounded-lg border ${className ?? ''}`}>
      <FakeAnchor href={postPath} onClick={(e) => e.stopPropagation()}>
        <div className="p-1">
          <div className="flex flex-row">
            <div className="flex flex-grow flex-col px-2 py-2">
              <div className="text-foreground mb-1 flex flex-row gap-2 text-opacity-60">
                <AuthorImage odinId={content.authorOdinId} className="h-7 w-7 rounded-full" />
                <div className="flex flex-col md:flex-row md:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center">
                  <h2>
                    <AuthorName odinId={content.authorOdinId} />
                  </h2>
                  <span className="hidden px-2 leading-4 md:block lg:hidden xl:block">·</span>
                  <PostMeta
                    postContent={content}
                    odinId={content.authorOdinId}
                    excludeContextMenu={true}
                    channel={channel || undefined}
                  />
                </div>
              </div>

              <PostBody
                post={{ ...content, embeddedPost: undefined }}
                odinId={content.authorOdinId}
              />

              {shouldHideMedia && content.primaryMediaFile ? (
                <p className="mt-2 text-slate-400 hover:underline">{t('See media')}</p>
              ) : null}
            </div>
          </div>
        </div>

        {!shouldHideMedia ? (
          <PostMedia
            postFile={{ content, payloadIsEncrypted: isChannelPublic }}
            odinId={content.authorOdinId}
            onClick={(e, index) => {
              e.stopPropagation();

              // Only navigate to the article if we're on desktop
              if (content.type !== 'Article')
                navigate(`${postPath}/${index}`, { state: { referrer: window.location.pathname } });
              else if (isDesktop)
                navigate(postPath, { state: { referrer: window.location.pathname } });
            }}
          />
        ) : null}
      </FakeAnchor>
    </div>
  );
};
