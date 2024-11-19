import { Article, PostContent, getChannelDrive } from '@homebase-id/js-lib/public';
import { ReactNode, useState } from 'react';
import { ellipsisAtMaxChar, t } from '../../../helpers';
import { RichTextRenderer } from '../../../richText';
import { EmbeddedPostContent } from './EmbeddedPostContent';
import { PayloadDescriptor } from '@homebase-id/js-lib/core';

const MAX_CHAR_FOR_SUMMARY = 400;

export const PostBody = ({
  post,
  odinId,
  hideEmbeddedPostMedia,
  fileId,
  globalTransitId,
  payloads,
  lastModified,
}: {
  post: PostContent;
  odinId?: string;
  hideEmbeddedPostMedia?: boolean;
  fileId: string | undefined;
  globalTransitId: string | undefined;
  payloads?: PayloadDescriptor[];
  lastModified: number | undefined;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (post.type === 'Article') {
    const articlePost = post as Article;

    const hasBody = !!articlePost.body;
    const hasAbstract = !!articlePost.abstract;
    const allowExpand = hasBody || (hasAbstract && articlePost.abstract?.length > 400);

    return (
      <>
        <h1 className={`text-foreground`}>{post.caption}</h1>
        <div className="text-foreground leading-relaxed text-opacity-70">
          <Expander
            abstract={ellipsisAtMaxChar(articlePost.abstract, MAX_CHAR_FOR_SUMMARY)}
            allowExpand={allowExpand}
          >
            <div className="rich-text-content leading-relaxed">
              <RichTextRenderer
                body={articlePost?.body}
                options={
                  fileId
                    ? {
                        imageDrive: getChannelDrive(post.channelId),
                        defaultFileId: fileId,
                        defaultGlobalTransitId: globalTransitId,
                        lastModified: lastModified,
                        previewThumbnails: payloads,
                      }
                    : undefined
                }
                odinId={odinId}
              />
            </div>
          </Expander>
        </div>
      </>
    );
  }

  // Only allow 7 new lines in caption; Remove the other new lines with regular spaces
  const splitCaption = post.caption.split('\n');
  const filteredCaption = splitCaption.slice(0, 7).join('\n') + splitCaption.slice(7).join(' ');

  return (
    <>
      <h1 className="text-foreground">
        {isExpanded || post.caption.length <= MAX_CHAR_FOR_SUMMARY ? (
          post.captionAsRichText ? (
            <RichTextRenderer body={post.captionAsRichText} odinId={odinId} />
          ) : (
            <span className="whitespace-pre-wrap">
              {isExpanded ? post.caption : filteredCaption}
            </span>
          )
        ) : (
          <>
            <span className="whitespace-pre-wrap">
              {ellipsisAtMaxChar(filteredCaption, MAX_CHAR_FOR_SUMMARY)}{' '}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsExpanded(true);
              }}
              className="text-primary/80 hover:underline"
            >
              {t('More')}...
            </button>
          </>
        )}
      </h1>

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

const Expander = ({
  abstract,
  children,
  allowExpand,
}: {
  abstract: ReactNode;
  children: ReactNode;
  allowExpand: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {!isExpanded ? (
        <>
          {abstract}
          {allowExpand ? (
            <>
              {' '}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }}
                className="text-primary/80 hover:underline"
              >
                {t('More')}...
              </button>
            </>
          ) : null}
        </>
      ) : (
        <>
          {children}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }}
            className="text-primary/80 hover:underline"
          >
            {t('Less')}
          </button>
        </>
      )}
    </>
  );
};
