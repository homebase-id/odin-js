import { Article, getChannelDrive, PostContent } from '@homebase-id/js-lib/public';
import { HomebaseFile } from '@homebase-id/js-lib/core';
// Self-hosted, so showing an abstract makes no request to a font CDN
import '@fontsource-variable/source-serif-4/opsz.css';
import { t } from '../../../helpers';
import { Image } from '../../../media/Image';

const SERIF_STYLE = {
  fontFamily: "'Source Serif 4 Variable', Georgia, serif",
  fontOpticalSizing: 'auto',
} as const;

/** The content block of an article's feed card: title, abstract, reading time and a cover thumbnail */
export const ArticleTeaser = ({
  postFile,
  odinId,
}: {
  postFile: HomebaseFile<PostContent>;
  odinId?: string;
}) => {
  const article = postFile.fileMetadata.appData.content as Article;
  const minutes = article.readingTimeStats?.minutes;

  const coverPayload = article.primaryMediaFile
    ? postFile.fileMetadata.payloads?.find(
        (payload) => payload.key === article.primaryMediaFile?.fileKey
      )
    : undefined;

  return (
    <div className="flex flex-row gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="line-clamp-2 text-[20px] font-semibold leading-[1.3] text-foreground">
          {article.caption}
        </h1>
        {article.abstract ? (
          <p
            className="mt-1 line-clamp-3 text-[16px] leading-[1.55] text-foreground/70"
            style={SERIF_STYLE}
          >
            {article.abstract}
          </p>
        ) : null}
        {minutes ? (
          <p className="mt-2 text-sm text-foreground/60">
            {Math.ceil(minutes)} {t('min read')}
          </p>
        ) : null}
      </div>
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
          className="h-20 w-20 shrink-0 rounded-lg bg-foreground/10 md:h-28 md:w-28"
        />
      ) : null}
    </div>
  );
};
