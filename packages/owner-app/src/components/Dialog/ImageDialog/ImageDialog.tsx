import {
  AccessControlList,
  ImageContentType,
  ImageUploadResult,
  TargetDrive,
} from '@youfoundation/js-lib';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import useImage from '../../../hooks/media/useImage';
import usePortal from '../../../hooks/portal/usePortal';
import ImageUploadAndCrop from '../../Form/ImageUploadAndCrop';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../ui/Buttons/ActionButton';
import { DialogWrapper } from '@youfoundation/common-app';

const ImageDialog = ({
  title,
  confirmText,
  expectedAspectRatio,
  maxHeight,
  maxWidth,
  isOpen,
  acl,
  targetDrive,
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

  onConfirm: (uploadResult?: ImageUploadResult) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { mutate: saveImage, status, error: saveError } = useImage().save;

  const [imageData, setImageData] = useState<{ bytes: Uint8Array; type: ImageContentType }>();

  if (!isOpen) {
    return null;
  }

  const uploadImage = async () => {
    if (!imageData) {
      return;
    }
    saveImage(
      {
        acl: acl,
        bytes: imageData.bytes,
        type: imageData.type,
        fileId: undefined,
        versionTag: undefined,
        targetDrive: targetDrive,
      },
      {
        onSuccess: (uploadResult) => {
          onConfirm(uploadResult);
          reset();
        },
      }
    );
  };

  const reset = () => {
    setImageData(undefined);
    return true;
  };

  const dialog = (
    <DialogWrapper onClose={() => reset() && onCancel()} title={title} size="2xlarge">
      <>
        <ErrorNotification error={saveError} />
        <ImageUploadAndCrop
          expectedAspectRatio={expectedAspectRatio}
          onChange={setImageData}
          defaultValue={imageData}
          disableClear={true}
          maxHeight={maxHeight}
          maxWidth={maxWidth}
        />

        <div className="-m-2 flex flex-row-reverse py-3">
          <ActionButton className="m-2" onClick={uploadImage} state={status}>
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

export default ImageDialog;
