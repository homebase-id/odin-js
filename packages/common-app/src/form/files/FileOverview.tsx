import { useMemo } from 'react';
import { ActionButton, AttachmentFile, Triangle, Image } from '@youfoundation/common-app';

import { ImageContentType, MediaFile, TargetDrive } from '@youfoundation/js-lib';

export const FileOverview = ({
  files,
  setFiles,
  className,
}: {
  files?: AttachmentFile[];
  setFiles: (files: AttachmentFile[]) => void;
  className?: string;
}) => {
  if (!files || !files.length) {
    return null;
  }

  const grabThumb = async (video: HTMLVideoElement, file: AttachmentFile, fileIndex: number) => {
    if (!video) return;
    if ('thumbnail' in file) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // create object url from blob
      const url = window.URL.createObjectURL(blob);
      console.log(url);

      const payload = await blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));

      const newFiles = [...files];
      newFiles[fileIndex] = {
        ...file,
        thumbnail: {
          payload: payload,
          contentType: blob.type as ImageContentType,
          pixelHeight: video.videoHeight,
          pixelWidth: video.videoWidth,
        },
      };

      setFiles(newFiles);
    }, 'image/png');
  };

  const renderedFiles = useMemo(() => {
    return files.map((currFile, index) => {
      const url =
        'bytes' in currFile.file
          ? window.URL.createObjectURL(
              new Blob([currFile.file.bytes], { type: currFile.file.type })
            )
          : URL.createObjectURL(currFile.file);

      if (currFile.file.type === 'video/mp4') {
        return (
          <div key={currFile.file.name} className="relative w-1/4 p-[2px] lg:w-1/3">
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
              icon="trash"
              type="remove"
              size="square"
              onClick={() =>
                setFiles([...files.filter((file) => file.file.name !== currFile.file.name)])
              }
            />
          </div>
        );
      }

      return (
        <div key={url} className="relative w-1/4 p-[2px] lg:w-1/3">
          <img
            src={url}
            onLoad={() => URL.revokeObjectURL(url)}
            className="aspect-square h-auto w-full object-cover"
          />
          <ActionButton
            className="absolute bottom-3 right-3"
            icon="trash"
            type="remove"
            size="square"
            onClick={() =>
              setFiles([...files.filter((file) => file.file.name !== currFile.file.name)])
            }
          />
        </div>
      );
    });
  }, [files]);

  return (
    <div className={`-m-[2px] flex flex-row flex-wrap ${className ?? ''}`}>{renderedFiles}</div>
  );
};

export const ExistingFileOverview = ({
  mediaFiles,
  toRemoveFileIds,
  targetDrive,
  setToRemoveFileIds,
  className,
}: {
  mediaFiles?: MediaFile[];
  toRemoveFileIds: string[];
  targetDrive: TargetDrive;
  setToRemoveFileIds: (mediaFileIds: string[]) => void;
  className?: string;
}) => {
  if (!mediaFiles) {
    return null;
  }

  const renderedFiles = useMemo(() => {
    return mediaFiles
      .filter((file) => !toRemoveFileIds.some((toRemoveFileId) => toRemoveFileId === file.fileId))
      .map((image) => {
        return (
          <div key={image.fileId} className="relative w-1/2 p-[2px] md:w-1/3">
            <Image
              fileId={image.fileId}
              targetDrive={targetDrive}
              className="aspect-square h-auto w-full"
              fit="cover"
            />
            <ActionButton
              className="absolute bottom-3 right-3"
              icon="trash"
              type="remove"
              size="square"
              onClick={(e) => {
                e.preventDefault();
                setToRemoveFileIds([...toRemoveFileIds, image.fileId]);
                return false;
              }}
            />
          </div>
        );
      });
  }, [mediaFiles, toRemoveFileIds]);

  return (
    <div className={`-m-[2px] flex flex-row flex-wrap ${className ?? ''}`}>{renderedFiles}</div>
  );
};
