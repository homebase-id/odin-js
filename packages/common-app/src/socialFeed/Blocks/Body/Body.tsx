import { Article, PostContent, getChannelDrive } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import { ellipsisAtMaxChar, t } from '../../../helpers';
import { RichTextRenderer } from '../../../richText';
import { EmbeddedPostContent } from './EmbeddedPostContent';

const MAX_CHAR_FOR_SUMMARY = 400;

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
              ellipsisAtMaxChar((post as Article).abstract, MAX_CHAR_FOR_SUMMARY)
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
          {isExpanded || post.caption.length <= MAX_CHAR_FOR_SUMMARY ? (
            post.captionAsRichText ? (
              <RichTextRenderer body={post.captionAsRichText} odinId={odinId} />
            ) : (
              <span className="whitespace-pre-wrap">{post.caption}</span>
            )
          ) : (
            <>
              {ellipsisAtMaxChar(post.caption, MAX_CHAR_FOR_SUMMARY)}{' '}
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
