import {
  AccessControlList,
  ImageContentType,
  ImageUploadResult,
  TargetDrive,
  ThumbnailInstruction,
} from '@youfoundation/js-lib/core';
import { createRef, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  CropperRef,
  GetCroppedData,
  t,
  useImage,
  usePortal,
} from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import ImageUploadAndCrop from '../ImageUploadAndCrop';

export const ImageDialog = ({
  title,
  confirmText,
  expectedAspectRatio,
  maxHeight,
  maxWidth,
  isOpen,
  acl,
  targetDrive,
  thumbInstructions,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;
  expectedAspectRatio?: number;
  maxHeight?: number;
  maxWidth?: number;

  isOpen: boolean;

  acl: AccessControlList;
  targetDrive: TargetDrive;

  thumbInstructions?: ThumbnailInstruction[];

  onConfirm: (uploadResult?: ImageUploadResult) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { mutate: saveImage, status, error: saveError } = useImage().save;
  const [isGettingData, setIsGettingData] = useState(false);
  const [unCroppedImageData, setUnCroppedImageData] = useState<{
    bytes: Uint8Array;
    type: ImageContentType;
  }>();
  const cropperRef = createRef<CropperRef>();
  if (!isOpen) return null;

  const doUploadImage = async () => {
    setIsGettingData(true);
    const imageData = (await GetCroppedData(cropperRef)) ?? unCroppedImageData;

    if (!imageData) {
      setIsGettingData(false);
      return;
    }

    saveImage(
      {
        acl: acl,
        bytes: imageData.bytes,
        type: imageData.type,
        fileId: undefined,
        versionTag: undefined,
        targetDrive,
        thumbInstructions,
      },
      {
        onSuccess: (uploadResult) => {
          onConfirm(uploadResult);
          reset();
        },
      }
    );
    setIsGettingData(false);
  };

  const reset = () => {
    setUnCroppedImageData(undefined);
    return true;
  };

  const dialog = (
    <DialogWrapper onClose={() => reset() && onCancel()} title={title} size="2xlarge">
      <>
        <ErrorNotification error={saveError} />
        <ImageUploadAndCrop
          expectedAspectRatio={expectedAspectRatio}
          disableClear={true}
          maxHeight={maxHeight}
          maxWidth={maxWidth}
          ref={cropperRef}
          onChange={setUnCroppedImageData}
          autoSave={false}
        />

        <div className="-m-2 flex flex-row-reverse py-3">
          <ActionButton
            className="m-2"
            onClick={doUploadImage}
            state={isGettingData ? 'loading' : status}
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
