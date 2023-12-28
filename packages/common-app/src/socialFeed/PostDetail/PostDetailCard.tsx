import {
  ChannelDefinition,
  PostContent,
  Media,
  Article,
  getChannelDrive,
} from '@youfoundation/js-lib/public';
import {
  LoadingBlock,
  AuthorImage,
  AuthorName,
  t,
  PostMeta,
  RichTextRenderer,
  Video,
  PostInteracts,
  Image,
  MediaGallery,
  EmbeddedPostContent,
} from '../../..';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';

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
  channel?: DriveSearchResult<ChannelDefinition> | NewDriveSearchResult<ChannelDefinition>;
  postFile?: DriveSearchResult<PostContent>;
  showAuthorDetail?: boolean;
  className?: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  onNavigate?: (path: string) => void;
  login?: () => void;
}) => {
  const post = postFile?.fileMetadata.appData.content;
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
            <LoadingBlock className="mb-2 h-8 w-full max-w-xs" />
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

              <PostMeta postFile={postFile} channel={channel} odinId={odinId} size="text-sm" />
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
              <RichTextRenderer body={post.captionAsRichText} odinId={odinId} />
            ) : (
              post.caption
            )}
          </h1>
        )}
      </div>

      {postFile?.fileId && post?.primaryMediaFile ? (
        mediaFiles && mediaFiles.length > 1 ? (
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
            {post.primaryMediaFile.type === 'image' ? (
              <Image
                odinId={odinId}
                className="rounded object-cover object-center"
                fileId={post.primaryMediaFile.fileId || postFile.fileId}
                globalTransitId={postFile.fileMetadata.globalTransitId}
                lastModified={postFile.fileMetadata.updated}
                fileKey={post.primaryMediaFile.fileKey}
                targetDrive={getChannelDrive(post.channelId)}
                alt="blog"
                previewThumbnail={postFile?.fileMetadata.appData.previewThumbnail}
                probablyEncrypted={postFile?.fileMetadata.isEncrypted}
              />
            ) : (
              <Video
                targetDrive={getChannelDrive(post.channelId)}
                fileId={post.primaryMediaFile.fileId || postFile.fileId}
                globalTransitId={postFile.fileMetadata.globalTransitId}
                lastModified={postFile.fileMetadata.updated}
                fileKey={post.primaryMediaFile.fileKey}
                odinId={odinId}
                className={`w-full rounded object-cover object-center`}
                probablyEncrypted={postFile?.fileMetadata.isEncrypted}
                previewThumbnail={postFile?.fileMetadata.appData.previewThumbnail}
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
                    }
                  : undefined
              }
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
          login={login}
          isPublic={
            channel?.serverMetadata?.accessControlList?.requiredSecurityGroup ===
              SecurityGroupType.Anonymous ||
            channel?.serverMetadata?.accessControlList?.requiredSecurityGroup ===
              SecurityGroupType.Authenticated
          }
        />
      ) : null}
    </div>
  );
};
