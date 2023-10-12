import {
  ChannelDefinition,
  PostFile,
  PostContent,
  Media,
  getChannelDrive,
} from '@youfoundation/js-lib/public';
import { useState, useEffect } from 'react';
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
  channel?: ChannelDefinition;
  postFile?: PostFile<PostContent>;
  isOwner: boolean;
  isAuthenticated: boolean;
  attachmentKey?: string;
  onClose: () => void;
  navigate: (path: string) => void;
  login?: () => void;
  rootUrl: string;
}) => {
  const [currIndex, setCurrIndex] = useState(attachmentKey ? parseInt(attachmentKey) : 0);
  const post = postFile?.content;

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

    setCurrIndex(newIndex);
    navigate(`${rootUrl}/${newIndex}`);
  };

  const doClose = () => {
    onClose();
  };

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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currIndex]);

  const currentMediaFile = mediaFileIds?.[currIndex];

  return (
    <div className="relative z-50 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="flex h-full min-h-screen flex-col lg:flex-row">
          <div
            className={`relative flex h-full max-h-screen flex-grow overflow-hidden lg:flex-grow-0`}
          >
            <div className="my-auto flex h-full w-full lg:w-[calc(100vw-25rem)] lg:p-5">
              {!post ? (
                <Loader className="m-auto h-10 w-10 text-white" />
              ) : currentMediaFile?.type !== 'video' ? (
                <Image
                  odinId={odinId}
                  className={`m-auto h-auto max-h-[calc(100vh-5rem)] w-auto max-w-full object-contain`}
                  fileId={currentMediaFile?.fileId}
                  targetDrive={getChannelDrive(post.channelId)}
                  alt="post"
                  fit="contain"
                  previewThumbnail={
                    mediaFileIds?.length === 1 ? postFile.previewThumbnail : undefined
                  }
                  probablyEncrypted={postFile.payloadIsEncrypted}
                />
              ) : (
                <Video
                  fileId={currentMediaFile?.fileId}
                  className={`m-auto flex h-full max-h-[calc(100vh-5rem)] w-full max-w-full flex-row items-center justify-center object-contain`}
                  targetDrive={getChannelDrive(post.channelId)}
                  previewThumbnail={
                    mediaFileIds?.length === 1 ? postFile.previewThumbnail : undefined
                  }
                  odinId={odinId}
                  probablyEncrypted={postFile.payloadIsEncrypted}
                />
              )}
            </div>
            <ActionButton
              icon={Times}
              onClick={doClose}
              className="fixed left-2 top-2 rounded-full p-3 lg:absolute"
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

          <div className="bg-background flex-shrink-0 flex-grow md:block lg:w-[25rem]">
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
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
