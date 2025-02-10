import {
  ChannelDefinition,
  PostContent,
  Article,
  getChannelDrive,
} from '@homebase-id/js-lib/public';
import {
  LoadingBlock,
  AuthorImage,
  AuthorName,
  t,
  PostMeta,
  RichTextRenderer,
  PostInteracts,
  MediaGallery,
  EmbeddedPostContent,
  PrimaryMedia,
  ToGroupBlock,
  PostSource,
} from '../../..';
import { DEFAULT_PAYLOAD_KEY, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';

export const PostDetailCard = ({
  odinId,
  channel,
  postFile,
  showAuthorDetail,
  className,
  isAuthenticated,
  isOwner,
  onNavigate,
  login,
}: {
  odinId?: string;
  channel?: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
  postFile?: HomebaseFile<PostContent>;
  showAuthorDetail?: boolean;
  className?: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  onNavigate?: (path: string) => void;
  login?: () => void;
}) => {
  const post = postFile?.fileMetadata.appData.content;
  const mediaFiles = postFile?.fileMetadata.payloads?.filter((p) => p.key !== DEFAULT_PAYLOAD_KEY);

  return (
    <div
      className={`bg-background rounded-lg border-gray-200 border-opacity-60  dark:border-gray-800 lg:border ${
        className ?? ''
      }`}
    >
      <PostSource postFile={postFile} className="rounded-t-lg" />
      <div className="p-4">
        <div className="mb-5 flex w-full flex-col">
          <div className="flex flex-row flex-wrap items-center pb-2 text-gray-500">
            {!post ? (
              <LoadingBlock className="mb-2 h-8 w-full max-w-xs" />
            ) : (
              <>
                {showAuthorDetail ? (
                  <>
                    <AuthorImage
                      odinId={postFile.fileMetadata.originalAuthor || odinId}
                      className="mr-2 h-[2rem] w-[2rem] rounded-full sm:h-[2.5rem] sm:w-[2.5rem]"
                    />
                    <h2>
                      <AuthorName odinId={postFile.fileMetadata.originalAuthor || odinId} />
                      <ToGroupBlock
                        channel={channel || undefined}
                        odinId={odinId}
                        authorOdinId={postFile.fileMetadata.originalAuthor}
                        className="ml-1"
                      />
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

                <PostMeta
                  postFile={postFile}
                  channel={channel}
                  odinId={odinId}
                  authorOdinId={postFile.fileMetadata.originalAuthor || odinId}
                  size="text-sm"
                />
              </>
            )}
          </div>
          {!post ? (
            <LoadingBlock className="h-8 w-full max-w-xs" />
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
                  options={{
                    defaultFileId: postFile?.fileId,
                    imageDrive: getChannelDrive(post.channelId),
                    defaultGlobalTransitId: postFile?.fileMetadata.globalTransitId,
                    lastModified: postFile?.fileMetadata.updated,
                    previewThumbnails: postFile?.fileMetadata.payloads,
                  }}
                />
              ) : (
                <span className="whitespace-pre-wrap">{post.caption}</span>
              )}
            </h1>
          )}
        </div>

        {postFile?.fileId && post?.primaryMediaFile ? (
          mediaFiles && mediaFiles.length > 1 && post.type !== 'Article' ? (
            <MediaGallery
              fileId={postFile.fileId}
              globalTransitId={postFile.fileMetadata.globalTransitId}
              lastModified={postFile.fileMetadata.updated}
              channelId={post.channelId}
              files={mediaFiles}
              className="my-4"
              maxVisible={4}
              odinId={odinId}
              probablyEncrypted={postFile?.fileMetadata.isEncrypted}
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
              {mediaFiles?.[0] ? (
                <PrimaryMedia
                  odinId={odinId}
                  className="rounded object-cover object-center"
                  fileId={post.primaryMediaFile.fileId || postFile.fileId}
                  globalTransitId={postFile.fileMetadata.globalTransitId}
                  lastModified={postFile.fileMetadata.updated}
                  file={mediaFiles?.[0]}
                  channelId={post.channelId}
                  previewThumbnail={
                    postFile?.fileMetadata.appData.previewThumbnail ||
                    postFile?.fileMetadata.payloads?.find(
                      (payload) => payload.key === post.primaryMediaFile?.fileKey
                    )?.previewThumbnail
                  }
                  probablyEncrypted={postFile?.fileMetadata.isEncrypted}
                />
              ) : null}
            </div>
          )
        ) : null}

        {post?.embeddedPost ? (
          <EmbeddedPostContent content={post.embeddedPost} className="my-5" />
        ) : null}

        {!post ? (
          <>
            <LoadingBlock className="mb-2 h-4 w-full" />
            <LoadingBlock className="mb-2 h-4 w-full" />
            <LoadingBlock className="mb-2 h-4 w-full" />
            <LoadingBlock className="mb-2 h-4 w-full" />
            <LoadingBlock className="mb-2 h-4 w-full" />
          </>
        ) : (
          post.type === 'Article' && (
            <div className="rich-text-content mb-5 leading-relaxed">
              <RichTextRenderer
                odinId={odinId}
                body={(post as Article)?.body}
                options={
                  postFile && postFile.fileId
                    ? {
                        imageDrive: getChannelDrive(post.channelId),
                        defaultFileId: postFile.fileId,
                        defaultGlobalTransitId: postFile.fileMetadata.globalTransitId,
                        lastModified: postFile.fileMetadata.updated,
                        previewThumbnails: postFile?.fileMetadata.payloads,
                      }
                    : undefined
                }
              />
            </div>
          )
        )}
        {postFile ? (
          <PostInteracts
            odinId={odinId || window.location.hostname}
            postFile={postFile}
            defaultExpanded={true}
            isAuthenticated={isAuthenticated}
            isOwner={isOwner}
            login={login}
          />
        ) : null}
      </div>
    </div>
  );
};
