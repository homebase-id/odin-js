import { useMemo } from 'react';
import { ActionButton, Triangle, Image, Trash, Video } from '@youfoundation/common-app';

import { DEFAULT_PAYLOAD_KEY, TargetDrive } from '@youfoundation/js-lib/core';
import { MediaFile, NewMediaFile } from '@youfoundation/js-lib/public';

export const FileOverview = ({
  files,
  setFiles,
  className,
  cols,
}: {
  files?: NewMediaFile[];
  setFiles: (files: NewMediaFile[]) => void;
  className?: string;
  cols?: 4 | 8;
}) => {
  if (!files || !files.length) return null;

  const grabThumb = async (video: HTMLVideoElement, file: NewMediaFile, fileIndex: number) => {
    if (!video) return;
    if ('thumbnail' in file) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const newFiles = [...files];
      newFiles[fileIndex] = {
        ...file,
        thumbnail: {
          payload: blob,
          pixelHeight: video.videoHeight,
          pixelWidth: video.videoWidth,
          key: DEFAULT_PAYLOAD_KEY,
        },
      };

      setFiles(newFiles);
    }, 'image/png');
  };

  const renderedFiles = useMemo(() => {
    return files.map((currFile, index) => {
      const url =
        'bytes' in currFile.file
          ? window.URL.createObjectURL(currFile.file)
          : URL.createObjectURL(currFile.file);

      if (currFile.file.type === 'video/mp4') {
        return (
          <div key={(currFile.file as File).name} className="relative">
            <video
              src={url}
              onLoadedMetadata={(e) => (e.currentTarget.currentTime = 1)}
              onSeeked={(e) => grabThumb(e.currentTarget, currFile, index)}
              className="aspect-square h-auto w-full object-cover"
              controls={false}
            />
            <div className="absolute inset-0 flex flex-row items-center justify-center">
              <Triangle className="text-background h-7 w-7" />
            </div>
            <ActionButton
              className="absolute bottom-3 right-3"
              icon={Trash}
              type="remove"
              size="square"
              onClick={() =>
                setFiles([
                  ...files.filter(
                    (file) => (file.file as File).name !== (currFile.file as File).name
                  ),
                ])
              }
            />
          </div>
        );
      }

      return (
        <div key={url} className="relative">
          <img
            src={url}
            onLoad={() => URL.revokeObjectURL(url)}
            className="aspect-square h-auto w-full object-cover"
          />
          <ActionButton
            className="absolute bottom-3 right-3"
            icon={Trash}
            type="remove"
            size="square"
            onClick={() =>
              setFiles([
                ...files.filter(
                  (file) => (file.file as File).name !== (currFile.file as File).name
                ),
              ])
            }
          />
        </div>
      );
    });
  }, [files]);

  return (
    <div
      className={`gap-[2px] grid ${cols === 8 ? 'grid-cols-8' : 'grid-cols-4'} ${className ?? ''}`}
    >
      {renderedFiles}
    </div>
  );
};

export const ExistingFileOverview = ({
  fileId,
  mediaFiles,
  targetDrive,
  setMediaFiles,
  className,
}: {
  mediaFiles?: MediaFile[];
  fileId: string;
  targetDrive: TargetDrive;
  setMediaFiles: (mediaFileIds: MediaFile[]) => void;
  className?: string;
}) => {
  if (!mediaFiles) return null;

  const renderedFiles = useMemo(() => {
    return mediaFiles.map((image) => {
      return (
        <div key={image.fileId + image.fileKey} className="relative w-1/2 p-[2px] md:w-1/3">
          {image.type === 'video' ? (
            <Video
              fileId={image.fileId || fileId}
              fileKey={image.fileKey}
              targetDrive={targetDrive}
              lastModified={new Date().getTime()}
              className="aspect-square h-full w-full"
              directFileSizeLimit={10 * 1024}
            />
          ) : (
            <Image
              fileId={image.fileId || fileId}
              fileKey={image.fileKey}
              targetDrive={targetDrive}
              lastModified={new Date().getTime()}
              className="aspect-square h-full w-full"
              fit="cover"
            />
          )}
          <ActionButton
            className="absolute bottom-3 right-3"
            icon={Trash}
            type="remove"
            size="square"
            onClick={(e) => {
              e.preventDefault();
              setMediaFiles(
                mediaFiles.filter(
                  (file) => file.fileId !== image.fileId || file.fileKey !== image.fileKey
                )
              );
              return false;
            }}
          />
        </div>
      );
    });
  }, [mediaFiles]);

  return (
    <div className={`-m-[2px] flex flex-row flex-wrap ${className ?? ''}`}>{renderedFiles}</div>
  );
};
