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

    const matchesAccept = (file: File, acceptList?: string): boolean => {
      if (!acceptList) return true;
      const tokens = acceptList
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!tokens.length) return true;

      const type = (file.type || '').toLowerCase();
      const name = file.name.toLowerCase();

      return tokens.some((token) => {
        if (token === '*/*') return true;
        if (token === '*') return true;
        // Wildcard mime e.g. image/*
        if (token.endsWith('/*')) {
          const base = token.slice(0, -1); // keep trailing slash trimmed
          return type.startsWith(base);
        }
        // Extension e.g. .png
        if (token.startsWith('.')) return name.endsWith(token);
        // Bare extension fallback (png)
        if (!token.includes('/') && !token.startsWith('.')) return name.endsWith('.' + token);
        // Common alias normalization
        if (token === 'image/jpg' && type === 'image/jpeg') return true;
        return type === token;
      });
    };

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
              const arr = Array.from(files).filter((f) => {
                if (!matchesAccept(f, accept)) {
                  alert(`File ${f.name} is not a supported file type.`);
                  return false;
                }
                return true;
              });
              onChange && onChange(arr);
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
        <DropZone
          onChange={onChange}
          accept={
            accept || 'image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif'
          }
          maxSize={maxSize}
        />
      </>
    );
  }
);

const DropZone = ({
  onChange,
  maxSize,
  accept,
}: {
  onChange?: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
}) => {
  const [dropZoneActive, setDropZoneActive] = useState(false);

  useEffect(() => {
    const onDragOver = (ev: DragEvent) => {
      ev.preventDefault();
      if (ev.dataTransfer?.items?.length) setDropZoneActive(true);
    };

    const onDragLeave = () => setDropZoneActive(false);
    const onDrop = () => setDropZoneActive(false);

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-row items-center justify-center border rounded-md bg-page-background p-5 ${dropZoneActive ? 'opacity-75' : 'pointer-events-none opacity-0'}`}
      onDropCapture={(ev) => {
        setDropZoneActive(false);

        // Prevent default behavior (Prevent file from being opened)
        ev.preventDefault();

        let newFiles = ev.dataTransfer.items
          ? [...ev.dataTransfer.items].map((itm) => itm.getAsFile())
          : [...ev.dataTransfer.files];

        newFiles = newFiles.filter((file) => {
          if (maxSize && file && file.size > maxSize) {
            alert(`File ${file.name} is too big. Max size is ${maxSize / 1024 / 1024} MB.`);
            return false;
          }
          if (accept && file) {
            const tokens = accept
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            const type = (file.type || '').toLowerCase();
            const name = file.name.toLowerCase();
            const matches = tokens.some((token) => {
              if (token === '*/*') return true;
              if (token === '*') return true;
              if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
              if (token.startsWith('.')) return name.endsWith(token);
              if (!token.includes('/') && !token.startsWith('.')) return name.endsWith('.' + token);
              if (token === 'image/jpg' && type === 'image/jpeg') return true;
              return type === token;
            });
            if (!matches) {
              alert(`File ${file.name} is not a supported file type.`);
              return false;
            }
          }
          return !!file;
        });

        onChange && onChange(newFiles.filter(Boolean) as File[]);
      }}
    >
      <p className="text-lg">{t('Drop your file(s) here to add')}</p>
    </div>
  );
};

FileSelector.displayName = 'FileSelector';
