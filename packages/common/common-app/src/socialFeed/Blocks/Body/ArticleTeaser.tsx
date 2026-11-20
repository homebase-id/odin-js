import { Article, getChannelDrive, PostContent } from '@homebase-id/js-lib/public';
import { HomebaseFile } from '@homebase-id/js-lib/core';
// Self-hosted, so showing an abstract makes no request to a font CDN
import '@fontsource-variable/inter';
import { t } from '../../../helpers';
import { Image } from '../../../media/Image';
import { openingExcerpt } from '../../ArticleReader/abstractSubtitle';

// The reader's font (Journal's Inter)
const INTER_STYLE = {
  fontFamily: "'Inter Variable', system-ui, sans-serif",
} as const;

/** The content block of an article's feed card: cover, title, summary and reading time */
export const ArticleTeaser = ({
  postFile,
  odinId,
}: {
  postFile: HomebaseFile<PostContent>;
  odinId?: string;
}) => {
  const article = postFile.fileMetadata.appData.content as Article;
  const minutes = article.readingTimeStats?.minutes;
  // The abstract, or the body's opening when there is none; an abstract that is the opening is the same text
  const summary = article.abstract?.trim() || openingExcerpt(article.body);

  const coverPayload = article.primaryMediaFile
    ? postFile.fileMetadata.payloads?.find(
        (payload) => payload.key === article.primaryMediaFile?.fileKey
      )
    : undefined;

  return (
    <div className="min-w-0 break-words">
      {postFile.fileId && coverPayload?.contentType?.startsWith('image') ? (
        <Image
          odinId={odinId}
          targetDrive={getChannelDrive(article.channelId)}
          fileId={postFile.fileId}
          globalTransitId={postFile.fileMetadata.globalTransitId}
          lastModified={postFile.fileMetadata.updated}
          fileKey={coverPayload.key}
          previewThumbnail={coverPayload.previewThumbnail}
          probablyEncrypted={postFile.fileMetadata.isEncrypted}
          fit="cover"
          className="mb-3 aspect-[2/1] w-full rounded-lg bg-foreground/10"
        />
      ) : null}
      <h1
        className="line-clamp-2 text-[20px] font-semibold leading-[1.3] text-foreground"
        style={INTER_STYLE}
      >
        {article.caption}
      </h1>
      {summary ? (
        <p
          className="mt-1 line-clamp-3 text-[16px] leading-[1.55] text-foreground/70"
          style={INTER_STYLE}
        >
          {summary}
        </p>
      ) : null}
      {minutes ? (
        <p className="mt-2 text-sm text-foreground/60">
          {Math.ceil(minutes)} {t('min read')}
        </p>
      ) : null}
    </div>
  );
};
