import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageUploadAndCrop } from '../ImageUploadAndCrop';
import { t } from '../../../helpers';
import { usePortal } from '../../../hooks';
import { DialogWrapper, ActionButton } from '../../../ui';
import { CropperRef, GetCroppedData } from './ImageCropper';

export const ImageDialog = ({
  title,
  confirmText,
  expectedAspectRatio,
  maxHeight,
  maxWidth,
  isOpen,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;
  expectedAspectRatio?: number;
  maxHeight?: number;
  maxWidth?: number;

  isOpen: boolean;

  onConfirm: (uploadResult: Blob | undefined) => void | Promise<void>;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [isGettingData, setIsGettingData] = useState(false);
  const [uncroppedData, setUncroppedData] = useState<Blob>();
  const cropperRef = useRef<CropperRef>();
  if (!isOpen) return null;

  const doUploadImage = async () => {
    setIsGettingData(true);
    const imageData = await GetCroppedData(cropperRef);

    if (imageData) await onConfirm(imageData);
    else if (uncroppedData) await onConfirm(uncroppedData);
    else console.error('No image data found', cropperRef);

    setIsGettingData(false);
  };

  const dialog = (
    <DialogWrapper
      onClose={() => onCancel()}
      title={title}
      size="2xlarge"
      zIndex={50}
      keepOpenOnBlur
    >
      <>
        <ImageUploadAndCrop
          expectedAspectRatio={expectedAspectRatio}
          disableClear={true}
          maxHeight={maxHeight}
          maxWidth={maxWidth}
          onLoad={(ref) => (cropperRef.current = ref)}
          onChange={(uncroppedData) => setUncroppedData(uncroppedData)}
          autoSave={false}
        />

        <div className="gap-2 flex flex-col sm:flex-row-reverse py-3">
          <ActionButton onClick={doUploadImage} state={isGettingData ? 'loading' : undefined}>
            {confirmText ?? 'Add'}
          </ActionButton>
          <ActionButton type="secondary" onClick={() => onCancel()}>
            {t('Cancel')}
          </ActionButton>
        </div>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
