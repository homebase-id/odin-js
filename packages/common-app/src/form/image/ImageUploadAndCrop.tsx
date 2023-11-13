import { fromBlob, ImageContentType } from '@youfoundation/js-lib/core';
import { useState, useMemo, forwardRef } from 'react';
import { t, Label, ActionButton, CropperRef } from '@youfoundation/common-app';
import { Crop, ImageCropper, Trash } from '@youfoundation/common-app';

interface ImageUploadAndCropProps {
  expectedAspectRatio?: number;
  onChange?: (imageData: Blob | undefined) => void;
  maxWidth?: number;
  maxHeight?: number;
  defaultValue?: Blob;
  disableClear?: boolean;
  autoSave?: boolean;
}

const ImageUploadAndCrop = forwardRef<CropperRef, ImageUploadAndCropProps>(
  (
    {
      expectedAspectRatio,
      onChange,
      maxWidth,
      maxHeight,
      defaultValue,
      disableClear,
      autoSave = true,
    },
    cropperRef
  ) => {
    const [rawImageData, setRawImageData] = useState<Blob | undefined>(defaultValue);
    const uploadedImageUrl = useMemo(() => {
      return rawImageData ? URL.createObjectURL(rawImageData) : undefined;
    }, [rawImageData]);
    const [croppedImageUrl, setCroppedImageUrl] = useState<string>();
    const [isCropping, setIsCropping] = useState(false);

    const onRawLoad: React.ReactEventHandler<HTMLImageElement> = async (e) => {
      onChange && onChange(rawImageData);

      const size = {
        height: e.currentTarget.naturalHeight,
        width: e.currentTarget.naturalWidth,
      };

      if (expectedAspectRatio && size.width / size.height !== expectedAspectRatio)
        setIsCropping(true);
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
                const resizedData = await fromBlob(file, 100, maxWidth, maxHeight, 'webp');
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
          } rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
        />
        {uploadedImageUrl ? (
          isCropping ? (
            <div className="relative">
              <ImageCropper
                imageUrl={uploadedImageUrl}
                expectedAspectRatio={expectedAspectRatio}
                onChange={onChange && autoSave ? onChange : undefined}
                ref={cropperRef}
              />
              {disableClear ? null : (
                <button
                  className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-red-200 p-2 dark:bg-red-800"
                  onClick={() => reset()}
                >
                  <Trash className="h-4 w-4" />
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
                  className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-red-200 p-2 dark:bg-red-800"
                  onClick={() => reset()}
                >
                  <Trash className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        ) : null}
      </div>
    );
  }
);
ImageUploadAndCrop.displayName = 'ImageUploadAndCrop';

export { ImageUploadAndCrop };
