import { Article, PostContent, getChannelDrive } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import { ellipsisAtMaxChar, t } from '../../../helpers';
import { RichTextRenderer } from '../../../richText';
import { AuthorImage } from '../Author/Image';
import { AuthorName } from '../Author/Name';
import { PostMedia } from '../Media/Media';

export const PostBody = ({ post, odinId }: { post: PostContent; odinId?: string }) => {
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

      {post.embeddedPost ? <EmbeddedPostContent content={post.embeddedPost} /> : null}
    </>
  );
};

export const EmbeddedPostContent = ({
  content,
  className,
}: {
  content: PostContent;
  className?: string;
}) => {
  return (
    <div className="pointer-events-none my-5 overflow-hidden rounded-lg border">
      <div className="p-1">
        <div className="flex flex-row">
          <div className="flex flex-grow flex-col px-4 py-3">
            <div className="text-foreground mb-1 flex flex-col text-opacity-60 md:flex-row md:flex-wrap md:items-center">
              <AuthorImage odinId={content.authorOdinId} className="mr-2 h-7 w-7 rounded-full" />
              <h2>
                <AuthorName odinId={content.authorOdinId} />
              </h2>
              {/* <span className="hidden px-2 leading-4 md:block">·</span> */}
              {/* <PostMeta
                postFile={postFile}
                odinId={content.authorOdinId}
                excludeContextMenu={true}
              /> */}
            </div>

            <PostBody post={content} odinId={content.authorOdinId} />
          </div>
        </div>
      </div>
      <PostMedia postFile={{ content }} odinId={content.authorOdinId} postPath="" />
    </div>
  );
};
