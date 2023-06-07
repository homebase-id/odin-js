import {
  ChannelDefinition,
  PostFile,
  PostContent,
  Media,
  Article,
  getChannelDrive,
} from '@youfoundation/js-lib/public';
import {
  LoadingParagraph,
  AuthorImage,
  AuthorName,
  t,
  PostMeta,
  RichTextRenderer,
  Video,
  PostInteracts,
  Image,
  MediaGallery,
} from '../../..';

export const PostDetailCard = ({
  odinId,
  channel,
  postFile,
  showAuthorDetail,
  className,
  isAuthenticated,
  isOwner,
  onNavigate,
}: {
  odinId?: string;
  channel?: ChannelDefinition;
  postFile?: PostFile<PostContent>;
  showAuthorDetail?: boolean;
  className?: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  onNavigate?: (path: string) => void;
}) => {
  const post = postFile?.content;
  const mediaFiles = (post as Media)?.mediaFiles;

  return (
    <div
      className={`bg-background rounded-lg border-gray-200 border-opacity-60 p-4 dark:border-gray-800 lg:border ${
        className ?? ''
      }`}
    >
      <div className="mb-5 flex w-full flex-col">
        <div className="flex flex-row flex-wrap items-center pb-2 text-gray-500">
          {!post ? (
            <LoadingParagraph className="mb-2 h-8 w-full max-w-xs" />
          ) : (
            <>
              {showAuthorDetail ? (
                <>
                  <AuthorImage
                    odinId={odinId}
                    className="mr-2 h-[2rem] w-[2rem] rounded-full sm:h-[2.5rem] sm:w-[2.5rem]"
                  />
                  <h2>
                    <AuthorName odinId={odinId} />
                  </h2>
                  <span className="px-2 leading-4">·</span>
                </>
              ) : null}
              {post.type === 'Article' && (post as Article)?.readingTimeStats && (
                <>
                  <p className="title-font text-sm font-medium">
                    {Math.ceil((post as Article)?.readingTimeStats?.minutes ?? 0)}
                    {t('min read')}
                  </p>
                  <span className="px-2 leading-4">·</span>
                </>
              )}
              {post && channel ? (
                <PostMeta postFile={postFile} channel={channel} odinId={odinId} size="text-sm" />
              ) : null}
            </>
          )}
        </div>
        {!post ? (
          <LoadingParagraph className="h-8 w-full max-w-xs" />
        ) : (
          <h1
            className={`title-font mb-4 ${
              post.type === 'Article' ? 'text-2xl font-medium sm:text-3xl' : ''
            }`}
          >
            {post.type !== 'Article' && post.captionAsRichText ? (
              <RichTextRenderer
                body={post.captionAsRichText}
                odinId={odinId}
                options={{ linksAlwaysBlank: true }}
              />
            ) : (
              post.caption
            )}
          </h1>
        )}
      </div>

      {post?.primaryMediaFile ? (
        mediaFiles && mediaFiles.length > 1 ? (
          <MediaGallery
            channelId={post.channelId}
            files={mediaFiles}
            className="my-4"
            maxVisible={4}
            postUrl={window.location.pathname}
            odinId={odinId}
            probablyEncrypted={postFile?.payloadIsEncrypted}
            onClick={
              onNavigate
                ? (e, index) => {
                    e.stopPropagation();
                    onNavigate(`${window.location.pathname}/${index}`);
                  }
                : undefined
            }
          />
        ) : (
          <div className="relative mb-5 sm:w-full">
            {post.primaryMediaFile.type === 'image' ? (
              <Image
                odinId={odinId}
                className="rounded object-cover object-center"
                fileId={post.primaryMediaFile.fileId}
                targetDrive={getChannelDrive(post.channelId)}
                alt="blog"
                previewThumbnail={postFile?.previewThumbnail}
                probablyEncrypted={postFile?.payloadIsEncrypted}
              />
            ) : (
              <Video
                targetDrive={getChannelDrive(post.channelId)}
                fileId={post.primaryMediaFile.fileId}
                odinId={odinId}
                className={`w-full rounded object-cover object-center`}
                probablyEncrypted={postFile?.payloadIsEncrypted}
              />
            )}
          </div>
        )
      ) : null}

      {post?.type === 'Article' ? (
        <p className="mb-5 text-base leading-relaxed text-gray-500">
          {(post as Article)?.abstract}
        </p>
      ) : null}

      {!post ? (
        <>
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
        </>
      ) : (
        post.type === 'Article' && (
          <div className="rich-text-content mb-5 leading-relaxed">
            <RichTextRenderer
              odinId={odinId}
              body={(post as Article)?.body}
              imageDrive={getChannelDrive(post.channelId)}
              options={{ linksAlwaysBlank: true }}
            />
          </div>
        )
      )}
      {postFile ? (
        <PostInteracts
          authorOdinId={odinId || window.location.hostname}
          postFile={postFile}
          defaultExpanded={true}
          isAuthenticated={isAuthenticated}
          isOwner={isOwner}
        />
      ) : null}
    </div>
  );
};
