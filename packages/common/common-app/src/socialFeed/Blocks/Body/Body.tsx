import {
  Article,
  POST_FULL_TEXT_PAYLOAD_KEY,
  PostContent,
  getChannelDrive,
} from '@homebase-id/js-lib/public';
import { ReactNode, useMemo, useState } from 'react';
import { ellipsisAtMaxChar, t } from '../../../helpers';
import { RichTextRenderer } from '../../../richText';
import { EmbeddedPostContent } from './EmbeddedPostContent';
import { PayloadDescriptor, TargetDrive } from '@homebase-id/js-lib/core';
import { usePostBody } from '../../../hooks/socialFeed/post/usePostBody';

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

  const targetDrive = getChannelDrive(post.channelId);

  const hasFullTextPayload = payloads?.some((p) => p.key === POST_FULL_TEXT_PAYLOAD_KEY);

  const { data: fullPost, isFetching: isFetchingCaption } = usePostBody({
    targetDrive,
    fileId,
    odinId,
    globalTransitId,
    headerPostContent: post,
    payloadKey: POST_FULL_TEXT_PAYLOAD_KEY,
    enabled: hasFullTextPayload && isExpanded,
  });

  const effectivePost = useMemo(() => {
    return fullPost || post;
  }, [fullPost, post]);

  if (effectivePost.type === 'Article') {
    const articlePost = effectivePost as Article;

    const hasBody = !!articlePost.body || hasFullTextPayload;
    const hasAbstract = !!articlePost.abstract;
    const allowExpand = hasBody || (hasAbstract && articlePost.abstract?.length > 400);

    return (
      <>
        <h1 className={`text-foreground`}>{post.caption}</h1>
        <div className="text-foreground leading-relaxed text-opacity-70">
          <Expander
            abstract={ellipsisAtMaxChar(articlePost.abstract, MAX_CHAR_FOR_SUMMARY)}
            allowExpand={allowExpand}
            isFetching={isFetchingCaption}
            onExpand={() => setIsExpanded(true)}
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
  const splitCaption = effectivePost.caption.split('\n');
  const filteredCaption = splitCaption.slice(0, 7).join('\n') + splitCaption.slice(7).join(' ');
  const hasMoreToShowNonArticle = useMemo(() => {
    return (
      !!hasFullTextPayload ||
      !!effectivePost.captionAsRichText ||
      (effectivePost.caption?.length ?? 0) > MAX_CHAR_FOR_SUMMARY
    );
  }, [effectivePost, hasFullTextPayload]);
  return (
    <>
      <h1 className="text-foreground">
        {isExpanded || !hasMoreToShowNonArticle ? (
          effectivePost.captionAsRichText ? (
            <RichTextRenderer
              body={effectivePost.captionAsRichText || effectivePost.caption}
              odinId={odinId}
            />
          ) : (
            <span className="whitespace-pre-wrap">{effectivePost.caption}</span>
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

      {isExpanded && isFetchingCaption ? (
        <div className="mt-2 animate-pulse">
          <div className="h-4 bg-foreground/10 rounded w-3/5 mb-2"></div>
          <div className="h-4 bg-foreground/10 rounded w-2/5"></div>
        </div>
      ) : null}

      {effectivePost.embeddedPost ? (
        <EmbeddedPostContent
          content={effectivePost.embeddedPost}
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
  isFetching,
  onExpand,
}: {
  abstract: ReactNode;
  children: ReactNode;
  allowExpand: boolean;
  isFetching: boolean;
  onExpand?: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const onExpandInternal = () => {
    onExpand?.();
    setIsExpanded(true);
  };

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
                  onExpandInternal();
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
          {isFetching ? (
            <div className="mb-3 animate-pulse">
              <div className="h-4 bg-foreground/10 rounded w-4/5 mb-2"></div>
              <div className="h-4 bg-foreground/10 rounded w-3/5"></div>
            </div>
          ) : null}
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
