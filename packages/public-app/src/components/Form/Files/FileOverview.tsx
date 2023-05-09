import { useMemo } from 'react';
import ActionButton from '../../ui/Buttons/ActionButton';
import { Triangle } from '@youfoundation/common-app';
import { FileLike } from '../../../hooks/socialFeed/post/usePost';

export const FileOverview = ({
  files,
  setFiles,
  className,
}: {
  files?: (File | FileLike)[];
  setFiles: (files: (File | FileLike)[]) => void;
  className?: string;
}) => {
  if (!files || !files.length) {
    return null;
  }

  const renderedFiles = useMemo(() => {
    return files.map((currFile) => {
      if (currFile.type === 'video/mp4') {
        return (
          <div key={currFile.name} className="relative w-1/4 p-[2px] lg:w-1/3">
            <video
              src={URL.createObjectURL(currFile)}
              className="aspect-square h-auto w-full object-cover"
              controls={false}
            />
            <div className="absolute inset-0 flex flex-row items-center justify-center">
              <Triangle className="h-7 w-7 text-background" />
            </div>
            <ActionButton
              className="absolute bottom-3 right-3"
              icon="trash"
              type="remove"
              size="square"
              onClick={() => setFiles([...files.filter((file) => file.name !== currFile.name)])}
            />
          </div>
        );
      }

      const url =
        'bytes' in currFile
          ? window.URL.createObjectURL(new Blob([currFile.bytes], { type: currFile.type }))
          : URL.createObjectURL(currFile);
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
            onClick={() => setFiles([...files.filter((file) => file.name !== currFile.name)])}
          />
        </div>
      );
    });
  }, [files]);

  return (
    <div className={`-m-[2px] flex flex-row flex-wrap ${className ?? ''}`}>{renderedFiles}</div>
  );
};
