import { useMemo } from 'react';
import {
  ActionButton,
  Triangle,
  Trash,
  useDotYouClient,
  ExtensionThumbnail,
} from '@youfoundation/common-app';

import {
  DEFAULT_PAYLOAD_KEY,
  TargetDrive,
  MediaFile,
  NewMediaFile,
} from '@youfoundation/js-lib/core';
import { OdinThumbnailImage } from '@youfoundation/ui-lib';

type NewFileArray = NewMediaFile[];
interface FileOverViewProps {
  targetDrive?: TargetDrive;
  files?: NewFileArray;
  setFiles: (files: NewFileArray) => void;
  className?: string;
  cols?: 4 | 8;
}

type ExistingFilesArray = (MediaFile | NewMediaFile)[];
interface ExistingFileOverviewProps {
  targetDrive?: TargetDrive;
  files?: ExistingFilesArray;
  setFiles: (files: ExistingFilesArray) => void;
  className?: string;
  cols?: 4 | 8;
}

export const FileOverview = ({
  targetDrive,
  files,
  setFiles,
  className,
  cols,
}: FileOverViewProps | ExistingFileOverviewProps) => {
  if (!files || !files.length) return null;
  const dotYouClient = useDotYouClient().getDotYouClient();

  const grabThumb = async (video: HTMLVideoElement, file: NewMediaFile, fileIndex: number) => {
    if (!video) return;
    if ('thumbnail' in file) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const newFiles: ExistingFilesArray = [...files];
      newFiles[fileIndex] = {
        ...file,
        thumbnail: {
          payload: blob,
          pixelHeight: video.videoHeight,
          pixelWidth: video.videoWidth,
          key: DEFAULT_PAYLOAD_KEY,
        },
      };

      setFiles(newFiles as NewFileArray);
    }, 'image/png');
  };

  const renderedFiles = useMemo(() => {
    return files.map((currFile, index) => {
      // Existing files:
      if (!('file' in currFile))
        return targetDrive ? (
          <div key={index} className="relative">
            {currFile.contentType.startsWith('image/') ? (
              <OdinThumbnailImage
                fileId={currFile.fileId}
                fileKey={currFile.key}
                targetDrive={targetDrive}
                className="aspect-square h-auto w-full object-cover"
                dotYouClient={dotYouClient}
                loadSize={{ pixelWidth: 400, pixelHeight: 400 }}
              />
            ) : currFile.contentType.startsWith('video/') ? (
              <>
                <OdinThumbnailImage
                  fileId={currFile.fileId}
                  fileKey={currFile.key}
                  targetDrive={targetDrive}
                  className="aspect-square h-auto w-full object-cover"
                  dotYouClient={dotYouClient}
                  loadSize={{ pixelWidth: 400, pixelHeight: 400 }}
                />
                <div className="absolute inset-0 flex flex-row items-center justify-center">
                  <Triangle className="text-background h-7 w-7" />
                </div>
              </>
            ) : (
              <ExtensionThumbnail contentType={currFile.contentType} />
            )}
            <ActionButton
              className="absolute bottom-3 right-3"
              icon={Trash}
              type="remove"
              size="square"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFiles(files.filter((file) => file !== currFile) as NewFileArray);
              }}
            />
          </div>
        ) : null;

      const url =
        'bytes' in currFile.file
          ? window.URL.createObjectURL(currFile.file)
          : URL.createObjectURL(currFile.file);

      return (
        <div key={(currFile.file as File).name || index} className="relative">
          {currFile.file.type === 'video/mp4' ? (
            <>
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
            </>
          ) : currFile.file.type.startsWith('image/') ? (
            <img
              src={url}
              onLoad={() => URL.revokeObjectURL(url)}
              className="aspect-square h-auto w-full object-cover"
            />
          ) : (
            <ExtensionThumbnail contentType={currFile.file.type} />
          )}
          <ActionButton
            className="absolute bottom-3 right-3"
            icon={Trash}
            type="remove"
            size="square"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFiles([
                ...(files.filter(
                  (file) =>
                    'file' in file && (file.file as File).name !== (currFile.file as File).name
                ) as NewFileArray),
              ]);
            }}
          />
        </div>
      );
    });
  }, [files]);

  return (
    <div
      className={`gap-[2px] grid ${
        cols === 8 ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' : cols === 4 ? 'grid-cols-4' : ''
      } ${className ?? ''}`}
    >
      {renderedFiles}
    </div>
  );
};
