import { createPortal } from 'react-dom';

import { EmbeddedThumb, SystemFileType, TargetDrive } from '@homebase-id/js-lib/core';

import { useEffect } from 'react';
import { ButtonColors } from '../../ui/Buttons/ColorConfig';
import { usePortal } from '../../hooks/portal/usePortal';
import { Times } from '../../ui/Icons/Times';
import { OdinImage } from '@homebase-id/ui-lib';
import { useOdinClientContext } from '../../hooks';

export const ImageLightbox = ({
  targetDrive,
  fileId,
  fileKey,
  previewThumbnail,
  lastModified,
  systemFileType,
  onClose,
}: {
  targetDrive: TargetDrive;
  fileId: string;
  fileKey: string;
  previewThumbnail?: EmbeddedThumb;
  lastModified: number | undefined;
  systemFileType?: SystemFileType;
  onClose: () => void;
}) => {
  const odinClient = useOdinClientContext();
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
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  const dialog = (
    <div className="fixed inset-0 z-40 bg-black lg:bg-transparent" role="dialog" aria-modal="true">
      <div className="inset-0 bg-black transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-screen flex-col lg:flex-row" onClick={onClose}>
          {onClose ? (
            <button
              onClick={onClose}
              className={`absolute left-4 top-4 rounded-full p-3 ${ButtonColors.secondary}`}
            >
              <Times className="h-5 w-5" />
            </button>
          ) : null}

          <OdinImage
            odinClient={odinClient}
            className={`m-auto h-auto max-h-screen w-auto max-w-full object-contain`}
            fileId={fileId}
            fileKey={fileKey}
            targetDrive={targetDrive}
            previewThumbnail={previewThumbnail}
            lastModified={lastModified}
            systemFileType={systemFileType}
            fit="contain"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};
