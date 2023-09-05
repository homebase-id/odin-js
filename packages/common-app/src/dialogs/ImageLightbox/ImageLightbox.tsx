import { createPortal } from 'react-dom';
import { usePortal, DialogWrapper, Times } from '@youfoundation/common-app';
import { EmbeddedThumb, TargetDrive } from '@youfoundation/js-lib/core';
import { Image } from '@youfoundation/common-app';
import { useEffect } from 'react';

export const ImageLightbox = ({
  targetDrive,
  fileId,
  previewThumbnail,
  onClose,
}: {
  targetDrive: TargetDrive;
  fileId: string;
  previewThumbnail?: EmbeddedThumb;

  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
    };
  });

  const dialog = (
    <div className="fixed inset-0 z-50 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-screen flex-col lg:flex-row">
          {onClose ? (
            <button
              onClick={onClose}
              className="bg-secondary text-secondary-contrast absolute left-4 top-4 rounded-full p-3 hover:brightness-90 hover:filter"
            >
              <Times className="h-4 w-4" />
            </button>
          ) : null}
          <Image
            className={`m-auto h-auto max-h-[calc(100vh-5rem)] w-auto max-w-full object-contain`}
            fileId={fileId}
            targetDrive={targetDrive}
            alt="post"
            fit="contain"
            previewThumbnail={previewThumbnail}
            explicitSize={'full'}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};
