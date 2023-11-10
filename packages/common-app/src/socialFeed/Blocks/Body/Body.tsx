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
  fileId,
  globalTransitId,
  lastModified,
}: {
  post: PostContent;
  odinId?: string;
  hideEmbeddedPostMedia?: boolean;
  fileId: string | undefined;
  globalTransitId: string | undefined;
  lastModified: number | undefined;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Type specific content */}
      {post.type === 'Article' ? (
        <>
          <h1 className={`text-foreground ${isExpanded ? 'text-2xl' : ''}`}>{post.caption}</h1>
          <div className="text-foreground leading-relaxed text-opacity-70">
            {isExpanded ? (
              <div className="rich-text-content leading-relaxed">
                <RichTextRenderer
                  body={(post as Article)?.body}
                  options={
                    fileId
                      ? {
                          imageDrive: getChannelDrive(post.channelId),
                          defaultFileId: fileId,
                          defaultGlobalTransitId: globalTransitId,
                          lastModified: lastModified,
                        }
                      : undefined
                  }
                  odinId={odinId}
                />
              </div>
            ) : (
              ellipsisAtMaxChar((post as Article).abstract, MAX_CHAR_FOR_SUMMARY)
            )}

            {(post as Article).body ||
            ((post as Article).abstract &&
              (post as Article).abstract?.length > MAX_CHAR_FOR_SUMMARY) ? (
              <>
                {' '}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-primary/80 hover:underline"
                >
                  {isExpanded ? t('Less') : <>{t('More')}...</>}
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : (
        <h1 className="text-foreground">
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
                className="text-primary/80 hover:underline"
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
