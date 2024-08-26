import { getNewId } from '@homebase-id/js-lib/helpers';
import { ReactNode } from 'react';

export const FileSelector = ({
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
}) => {
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
        accept={accept || 'image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif'}
        multiple
        className={`sr-only`}
      />
    </>
  );
};
