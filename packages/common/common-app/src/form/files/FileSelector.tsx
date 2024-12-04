import { getNewId } from '@homebase-id/js-lib/helpers';
import { forwardRef, ReactNode, useEffect, useState } from 'react';
import { t } from '../../helpers';

export const FileSelector = forwardRef(
  (
    {
      children,
      onChange,
      className,
      accept,
      maxSize,
    }: {
      children?: ReactNode;
      onChange?: (files: File[]) => void;
      className?: string;
      accept?: string;
      maxSize?: number;
    },
    ref: React.Ref<HTMLInputElement>
  ) => {
    const id = getNewId();

    return (
      <>
        <label htmlFor={id} className={`block cursor-pointer select-none ${className ?? ''}`}>
          {children ?? '+'}
        </label>
        <input
          id={id}
          name={id}
          onChange={(e) => {
            const files = e.target?.files;
            if (files) {
              if (maxSize) {
                for (let i = 0; i < files.length; i++) {
                  if (files[i].size > maxSize) {
                    alert(
                      `File ${files[i].name} is too big. Max size is ${maxSize / 1024 / 1024} MB.`
                    );
                    e.target.value = '';
                    return;
                  }
                }
              }
              onChange && onChange(Array.from(files));
            }
          }}
          type="file"
          accept={
            accept || 'image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif'
          }
          multiple
          className={`sr-only`}
          ref={ref}
        />
        <DropZone onChange={onChange} />
      </>
    );
  }
);

const DropZone = ({ onChange }: { onChange?: (files: File[]) => void }) => {
  const [dropZoneActive, setDropZoneActive] = useState(false);

  useEffect(() => {
    const onDragOver = (ev: DragEvent) => {
      ev.preventDefault();
      setDropZoneActive(true);
    };

    const onDragLeave = () => setDropZoneActive(false);
    const opDrop = () => setDropZoneActive(false);

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', opDrop);

    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', opDrop);
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-row items-center justify-center border rounded-md bg-page-background p-5 ${dropZoneActive ? 'opacity-75' : 'pointer-events-none opacity-0'}`}
      onDropCapture={(ev) => {
        setDropZoneActive(false);

        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();

        const newFiles = ev.dataTransfer.items
          ? [...ev.dataTransfer.items].map((itm) => itm.getAsFile())
          : [...ev.dataTransfer.files];

        onChange && onChange(newFiles.filter(Boolean) as File[]);
      }}
    >
      <p className="text-lg">{t('Drop your file(s) here to add')}</p>
    </div>
  );
};

FileSelector.displayName = 'FileSelector';
