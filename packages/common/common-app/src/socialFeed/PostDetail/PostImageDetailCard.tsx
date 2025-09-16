import {
  ChannelDefinition,
  GetTargetDriveFromChannelId,
  PostContent,
  getChannelDrive,
} from '@homebase-id/js-lib/public';
import { useEffect } from 'react';

import {
  DEFAULT_PAYLOAD_DESCRIPTOR_KEY,
  DEFAULT_PAYLOAD_KEY,
  HomebaseFile,
  NewHomebaseFile,
} from '@homebase-id/js-lib/core';
import { getAnonymousDirectImageUrl } from '@homebase-id/js-lib/media';
import { Helmet } from 'react-helmet-async';
import { Video } from '../../media/Video';
import { ActionButton } from '../../ui';
import { Loader, Times, ArrowLeft, Arrow } from '../../ui/Icons';
import { AuthorImage } from '../Blocks/Author/AuthorImage';
import { AuthorName } from '../Blocks/Author/AuthorName';
import { PostInteracts } from '../Blocks/Interacts/PostInteracts';
import { BoringFile } from '../Blocks/Media/PrimaryMedia';
import { PostMeta, ToGroupBlock } from '../Blocks/Meta/Meta';
import { Image } from '../../media/Image';
import { PostSource } from '../Blocks/Meta/PostSource';

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
  channel?: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
  postFile?: HomebaseFile<PostContent>;
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

  const mediaFiles = postFile?.fileMetadata.payloads?.filter(
    (p) => p.key !== DEFAULT_PAYLOAD_KEY && !p.key.includes(DEFAULT_PAYLOAD_DESCRIPTOR_KEY)
  );

  const doSlide = (dir: 1 | -1) => {
    const dirtyIndex = currIndex + dir;
    let newIndex = dirtyIndex;
    if (mediaFiles && dirtyIndex >= mediaFiles.length) {
      newIndex = mediaFiles.length - 1;

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

  const currentMediaFile = mediaFiles?.[currIndex];

  return (
    <>
      <Helmet>
        {channel?.fileMetadata.appData.uniqueId ? (
          <meta
            name="og:image"
            content={getAnonymousDirectImageUrl(
              window.location.host,
              GetTargetDriveFromChannelId(channel.fileMetadata.appData.uniqueId),
              postFile?.fileId || '',
              currentMediaFile?.key || ''
            )}
          />
        ) : null}
      </Helmet>
      <div className="relative z-40 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
        <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
        <div className="inset-0 z-10 lg:fixed">
          <div className="flex h-full min-h-screen flex-col lg:flex-row overflow-auto lg:overflow-none">
            <div
              className={`relative flex h-[60vh] lg:h-full lg:flex-grow max-h-screen flex-grow-0 overflow-hidden`}
            >
              {!post ? (
                <Loader className="m-auto h-10 w-10 text-white" />
              ) : currentMediaFile?.contentType.startsWith('image') ? (
                <Image
                  odinId={odinId}
                  className={`absolute inset-0 flex max-h-[60vh] lg:max-h-full lg:w-full lg:static`}
                  fileId={postFile.fileId}
                  globalTransitId={postFile.fileMetadata.globalTransitId}
                  fileKey={currentMediaFile?.key}
                  targetDrive={getChannelDrive(post.channelId)}
                  lastModified={postFile.fileMetadata.updated}
                  alt="post"
                  fit="contain"
                  previewThumbnail={
                    mediaFiles?.length === 1
                      ? postFile.fileMetadata.appData.previewThumbnail
                      : undefined
                  }
                  probablyEncrypted={postFile.fileMetadata.isEncrypted}
                  key={(postFile.fileId || '') + (currentMediaFile?.key || currIndex)}
                />
              ) : currentMediaFile?.contentType.startsWith('video') ||
                currentMediaFile?.contentType === 'application/vnd.apple.mpegurl' ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video
                    fileId={postFile.fileId}
                    globalTransitId={postFile.fileMetadata.globalTransitId}
                    lastModified={postFile.fileMetadata.updated}
                    fileKey={currentMediaFile?.key}
                    className={`object-contain max-h-full`}
                    targetDrive={getChannelDrive(post.channelId)}
                    previewThumbnail={
                      mediaFiles?.length === 1
                        ? postFile.fileMetadata.appData.previewThumbnail
                        : undefined
                    }
                    odinId={odinId}
                    probablyEncrypted={postFile.fileMetadata.isEncrypted}
                  />
                </div>
              ) : currentMediaFile ? (
                <BoringFile
                  odinId={odinId}
                  targetDrive={getChannelDrive(post.channelId)}
                  fileId={postFile.fileId}
                  globalTransitId={postFile.fileMetadata.globalTransitId}
                  file={currentMediaFile}
                  canDownload={true}
                />
              ) : null}
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
              {mediaFiles && currIndex !== mediaFiles.length - 1 ? (
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
              <PostSource postFile={postFile} className="p-5" />
              {post && channel ? (
                <div className="grid grid-flow-col grid-cols-[3rem_auto] gap-3 p-5 pb-0">
                  <AuthorImage odinId={postFile.fileMetadata.originalAuthor || odinId} size="sm" />
                  <div className="flex max-w-lg flex-grow flex-col">
                    <div className="text-foreground mb-2 text-opacity-60">
                      <h2 className="mr-4">
                        <AuthorName odinId={postFile.fileMetadata.originalAuthor || odinId} />
                        <ToGroupBlock
                          channel={channel || undefined}
                          odinId={odinId}
                          authorOdinId={postFile.fileMetadata.originalAuthor}
                          className="ml-1"
                        />
                      </h2>

                      <PostMeta
                        odinId={odinId}
                        channel={channel}
                        postFile={postFile}
                        authorOdinId={postFile.fileMetadata.originalAuthor || odinId}
                        excludeContextMenu={true}
                      />
                    </div>
                    <p>{post?.caption}</p>
                  </div>
                </div>
              ) : null}
              {postFile ? (
                <PostInteracts
                  odinId={odinId || postFile.fileMetadata.senderOdinId || window.location.hostname}
                  postFile={postFile}
                  defaultExpanded={true}
                  className="p-5"
                  isAuthenticated={isAuthenticated}
                  isOwner={isOwner}
                  login={login}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
