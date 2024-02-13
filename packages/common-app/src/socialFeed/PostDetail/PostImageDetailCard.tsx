import {
  ChannelDefinition,
  PostContent,
  Media,
  getChannelDrive,
} from '@youfoundation/js-lib/public';
import { useEffect } from 'react';
import {
  Loader,
  Video,
  ActionButton,
  AuthorImage,
  AuthorName,
  PostMeta,
  PostInteracts,
  Image,
  Times,
  ArrowLeft,
  Arrow,
} from '../../..';
import {
  DriveSearchResult,
  NewDriveSearchResult,
  SecurityGroupType,
} from '@youfoundation/js-lib/core';

export const PostImageDetailCard = ({
  odinId,
  channel,
  postFile,
  isOwner,
  isAuthenticated,
  attachmentKey,
  onClose,
  navigate,
  login,
  rootUrl,
}: {
  odinId?: string;
  channel?: DriveSearchResult<ChannelDefinition> | NewDriveSearchResult<ChannelDefinition>;
  postFile?: DriveSearchResult<PostContent>;
  isOwner: boolean;
  isAuthenticated: boolean;
  attachmentKey?: string;
  onClose: () => void;
  navigate: (path: string) => void;
  login?: () => void;
  rootUrl: string;
}) => {
  const currIndex = attachmentKey ? parseInt(attachmentKey) : 0;
  const post = postFile?.fileMetadata.appData.content;

  const mediaFileIds =
    (post as Media)?.mediaFiles || (post?.primaryMediaFile ? [post.primaryMediaFile] : undefined);

  const doSlide = (dir: 1 | -1) => {
    const dirtyIndex = currIndex + dir;
    let newIndex = dirtyIndex;
    if (mediaFileIds && dirtyIndex >= mediaFileIds.length) {
      newIndex = mediaFileIds.length - 1;

      return;
    }
    if (dirtyIndex < 0) {
      newIndex = 0;

      return;
    }

    navigate(`${rootUrl}/${newIndex}`);
  };

  const doClose = onClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();

        doSlide(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();

        doSlide(1);
      } else if (e.key === 'Escape') {
        e.preventDefault();

        doClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currIndex]);

  const currentMediaFile = mediaFileIds?.[currIndex];

  return (
    <div className="relative z-40 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed">
        <div className="flex h-full min-h-screen flex-col lg:flex-row overflow-auto lg:overflow-none">
          <div
            className={`relative flex h-[60vh] lg:h-full lg:flex-grow max-h-screen flex-grow-0 overflow-hidden`}
          >
            {!post ? (
              <Loader className="m-auto h-10 w-10 text-white" />
            ) : currentMediaFile?.type !== 'video' ? (
              <Image
                odinId={odinId}
                className={`absolute inset-0 flex max-h-[60vh] lg:max-h-full lg:w-full lg:static`}
                fileId={currentMediaFile?.fileId || postFile.fileId}
                globalTransitId={postFile.fileMetadata.globalTransitId}
                fileKey={currentMediaFile?.fileKey}
                targetDrive={getChannelDrive(post.channelId)}
                lastModified={postFile.fileMetadata.updated}
                alt="post"
                fit="contain"
                previewThumbnail={
                  mediaFileIds?.length === 1
                    ? postFile.fileMetadata.appData.previewThumbnail
                    : undefined
                }
                probablyEncrypted={postFile.fileMetadata.isEncrypted}
                key={
                  (currentMediaFile?.fileId || postFile.fileId || '') +
                  (currentMediaFile?.fileKey || currIndex)
                }
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Video
                  fileId={currentMediaFile?.fileId || postFile.fileId}
                  globalTransitId={postFile.fileMetadata.globalTransitId}
                  lastModified={postFile.fileMetadata.updated}
                  fileKey={currentMediaFile?.fileKey}
                  className={`object-contain max-h-full`}
                  targetDrive={getChannelDrive(post.channelId)}
                  previewThumbnail={
                    mediaFileIds?.length === 1
                      ? postFile.fileMetadata.appData.previewThumbnail
                      : undefined
                  }
                  odinId={odinId}
                  probablyEncrypted={postFile.fileMetadata.isEncrypted}
                />
              </div>
            )}
            <ActionButton
              icon={Times}
              onClick={doClose}
              className="absolute left-2 top-2 rounded-full p-3 lg:absolute"
              size="square"
              type="secondary"
            />
            {currIndex !== 0 ? (
              <ActionButton
                icon={ArrowLeft}
                onClick={() => doSlide(-1)}
                className="absolute left-2 top-[calc(50%-1.25rem)] rounded-full p-3"
                size="square"
                type="secondary"
              />
            ) : null}
            {mediaFileIds && currIndex !== mediaFileIds.length - 1 ? (
              <ActionButton
                icon={Arrow}
                onClick={() => doSlide(1)}
                className="absolute right-2 top-[calc(50%-1.25rem)] rounded-full p-3"
                size="square"
                type="secondary"
              />
            ) : null}
          </div>

          <div className="bg-background flex-shrink-0 lg:max-h-screen flex-grow md:block lg:w-[27rem] lg:flex-grow-0 lg:overflow-auto">
            <div className="grid grid-flow-col grid-cols-[3rem_auto] gap-3 p-5 pb-0">
              <AuthorImage odinId={odinId} size="sm" />
              <div className="flex max-w-lg flex-grow flex-col">
                <div className="text-foreground mb-2 text-opacity-60">
                  <h2 className="mr-4">
                    <AuthorName odinId={odinId} />
                  </h2>
                  {post && channel ? (
                    <PostMeta
                      odinId={odinId}
                      channel={channel}
                      postFile={postFile}
                      excludeContextMenu={true}
                    />
                  ) : null}
                </div>
                <p>{post?.caption}</p>
              </div>
            </div>
            {postFile ? (
              <PostInteracts
                authorOdinId={odinId || window.location.hostname}
                postFile={postFile}
                defaultExpanded={true}
                className="p-5"
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
        </div>
      </div>
    </div>
  );
};
