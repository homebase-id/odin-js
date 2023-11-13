import { createRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DialogWrapper } from '@youfoundation/common-app';
import { ImageUploadAndCrop } from '../ImageUploadAndCrop';
import { ActionButton, CropperRef, GetCroppedData, t, usePortal } from '@youfoundation/common-app';

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
  const [unCroppedImageData, setUnCroppedImageData] = useState<Blob | undefined>();
  const cropperRef = createRef<CropperRef>();
  if (!isOpen) return null;

  const doUploadImage = async () => {
    setIsGettingData(true);
    const imageData = (await GetCroppedData(cropperRef)) ?? unCroppedImageData;

    await onConfirm(imageData);
    setIsGettingData(false);
  };

  const reset = () => {
    setUnCroppedImageData(undefined);
    return true;
  };

  const dialog = (
    <DialogWrapper onClose={() => reset() && onCancel()} title={title} size="2xlarge">
      <>
        <ImageUploadAndCrop
          expectedAspectRatio={expectedAspectRatio}
          disableClear={true}
          maxHeight={maxHeight}
          maxWidth={maxWidth}
          ref={cropperRef}
          onChange={(data) => data && setUnCroppedImageData(data)}
          autoSave={false}
        />

        <div className="-m-2 flex flex-row-reverse py-3">
          <ActionButton
            className="m-2"
            onClick={doUploadImage}
            state={isGettingData ? 'loading' : undefined}
          >
            {confirmText ?? 'Add'}
          </ActionButton>
          <ActionButton className="m-2" type="secondary" onClick={() => reset() && onCancel()}>
            {t('Cancel')}
          </ActionButton>
        </div>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
