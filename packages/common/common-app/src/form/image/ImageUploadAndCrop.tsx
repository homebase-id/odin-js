import { useState, useMemo } from 'react';
import { resizeImageFromBlob } from '@homebase-id/js-lib/media';
import { t } from '../../helpers';
import { ActionButton } from '../../ui';
import { Label } from '../Label';
import { CropperRef, ImageCropper } from './ImageDialog/ImageCropper';
import { Trash, Crop } from '../../ui/Icons';

interface ImageUploadAndCropProps {
  expectedAspectRatio?: number;
  onChange?: (imageData: Blob | undefined) => void;
  maxWidth?: number;
  maxHeight?: number;
  defaultValue?: Blob;
  disableClear?: boolean;
  autoSave?: boolean;
  onLoad?: (ref: CropperRef) => void;
}

const ImageUploadAndCrop = ({
  expectedAspectRatio,
  onChange,
  maxWidth,
  maxHeight,
  defaultValue,
  disableClear,
  autoSave = true,
  onLoad,
}: ImageUploadAndCropProps) => {
  const [rawImageData, setRawImageData] = useState<Blob | undefined>(defaultValue);
  const uploadedImageUrl = useMemo(() => {
    return rawImageData ? URL.createObjectURL(rawImageData) : undefined;
  }, [rawImageData]);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>();
  const [isCropping, setIsCropping] = useState(false);

  const onRawLoad: React.ReactEventHandler<HTMLImageElement> = async (e) => {
    const size = {
      height: e.currentTarget.naturalHeight,
      width: e.currentTarget.naturalWidth,
    };

    if (expectedAspectRatio && size.width / size.height !== expectedAspectRatio)
      setIsCropping(true);
    else onChange && onChange(rawImageData);
  };

  const reset = () => {
    setRawImageData(undefined);
    setCroppedImageUrl(undefined);
    setIsCropping(false);
    onChange && onChange(undefined);
  };

  return (
    <div className="sm:flex sm:items-start">
      <Label htmlFor="file-select" className="sr-only">
        {t('Select a file')}:
      </Label>
      <input
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (maxWidth && maxHeight) {
            if (file.type === 'image/svg+xml') {
              setRawImageData(file);
            } else {
              const resizedData = await resizeImageFromBlob(file, 100, maxWidth, maxHeight, 'webp');
              setRawImageData(resizedData.blob);
            }
          } else {
            setRawImageData(file);
          }

          e.target.value = null as unknown as string;
        }}
        name="file-select"
        id="file-select"
        type="file"
        accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif"
        className={`${
          uploadedImageUrl ? 'sr-only' : 'w-full'
        } rounded border border-outline bg-field-raised px-3 py-1 text-base leading-8 text-field-contrast outline-none transition-colors duration-200 ease-in-out focus:border-accent focus:ring-2 focus:ring-focus-ring-soft`}
      />
      {uploadedImageUrl ? (
        isCropping ? (
          <div className="relative">
            <ImageCropper
              imageUrl={uploadedImageUrl}
              expectedAspectRatio={expectedAspectRatio}
              onChange={onChange && autoSave ? onChange : undefined}
              onLoad={onLoad}
            />
            {disableClear ? null : (
              <button
                className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-remove-control p-2 text-remove-control-contrast"
                onClick={() => reset()}
              >
                <Trash className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <img
              src={croppedImageUrl || uploadedImageUrl}
              alt="uploaded image"
              onLoad={onRawLoad}
            />
            <ActionButton
              icon={Crop}
              onClick={(e) => {
                e.preventDefault();
                setIsCropping(true);
              }}
              type="secondary"
              size="square"
              className="absolute right-3 top-3"
            />
            {disableClear ? null : (
              <button
                className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-remove-control p-2 text-remove-control-contrast"
                onClick={() => reset()}
              >
                <Trash className="h-5 w-5" />
              </button>
            )}
          </div>
        )
      ) : null}
    </div>
  );
};
ImageUploadAndCrop.displayName = 'ImageUploadAndCrop';

export { ImageUploadAndCrop };
