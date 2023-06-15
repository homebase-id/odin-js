import { Article, EmbeddedPost, PostContent, getChannelDrive } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import { ellipsisAtMaxChar, t } from '../../../helpers';
import { RichTextRenderer } from '../../../richText';
import { AuthorImage } from '../Author/Image';
import { AuthorName } from '../Author/Name';
import { PostMedia } from '../Media/Media';
import { PostMeta } from '../Meta/Meta';
import { useSocialChannel, useChannel } from '../../../hooks';

export const PostBody = ({
  post,
  odinId,
  hideEmbeddedPost,
}: {
  post: PostContent;
  odinId?: string;
  hideEmbeddedPost?: boolean;
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
        hideEmbeddedPost ? (
          <EmbeddedPostLink content={post.embeddedPost} className="mt-3" />
        ) : (
          <EmbeddedPostContent content={post.embeddedPost} className="mt-3" />
        )
      ) : null}
    </>
  );
};

export const EmbeddedPostLink = ({
  content,
  className,
}: {
  content: EmbeddedPost;
  className?: string;
}) => {
  return (
    <a
      href={content?.permalink}
      className={`text-button break- block hover:underline ${className || ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {t('Post from ')} {content?.authorOdinId}
    </a>
  );
};

export const EmbeddedPostContent = ({
  content,
  className,
}: {
  content: EmbeddedPost;
  className?: string;
}) => {
  const isExternal = !content.authorOdinId || content.authorOdinId !== window.location.hostname;

  const { data: externalChannel } = useSocialChannel({
    odinId: isExternal ? content.authorOdinId : undefined,
    channelId: content.channelId,
  }).fetch;
  const { data: internalChannel } = useChannel({ channelId: content.channelId }).fetch;

  const channel = externalChannel || internalChannel;

  if (!channel) {
    // many things will be broken if we don't have a channel;
    // Perhaps we just show the permalink then?
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${className ?? ''}`}>
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
          </div>
        </div>
      </div>
      <PostMedia postFile={{ content }} odinId={content.authorOdinId} postPath="" />
    </div>
  );
};
