import { getNewId } from '@youfoundation/js-lib/helpers';
import { ReactNode } from 'react';

export const FileSelector = ({
  children,
  onChange,
  className,
  accept,
}: {
  children?: ReactNode;
  onChange?: (files: File[]) => void;
  className?: string;
  accept?: string;
}) => {
  const id = getNewId();

  return (
    <>
      <label
        htmlFor={id}
        className={`block cursor-pointer select-none px-2 py-1 ${className ?? ''}`}
      >
        {children ?? '+'}
      </label>
      <input
        id={id}
        name={id}
        onChange={(e) => {
          const files = e.target?.files;
          if (files) {
            onChange && onChange(Array.from(files));
          }
        }}
        type="file"
        accept={accept || 'image/png, image/jpeg, image/tiff, image/webp, image/svg+xml'}
        multiple
        className={`sr-only`}
      />
    </>
  );
};
