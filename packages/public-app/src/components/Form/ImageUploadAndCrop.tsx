import { fromBlob, ImageContentType } from '@youfoundation/js-lib';
import { useState, useMemo } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import ImageCropper from '../RichTextEditor/ImageDialog/ImageCropper';
import ActionButton from '../ui/Buttons/ActionButton';
import { Crop } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import Label from './Label';

interface ImageUploadAndCropProps {
  expectedAspectRatio?: number;
  onChange: (imageData: { bytes: Uint8Array; type: ImageContentType } | undefined) => void;
  maxWidth?: number;
  maxHeight?: number;
  defaultValue?: { bytes: Uint8Array; type: ImageContentType };
  disableClear?: boolean;
}

const ImageUploadAndCrop = ({
  expectedAspectRatio,
  onChange,
  maxWidth,
  maxHeight,
  defaultValue,
  disableClear,
}: ImageUploadAndCropProps) => {
  const [rawImageData, setRawImageData] = useState<
    { bytes: Uint8Array; type: ImageContentType } | undefined
  >(defaultValue);
  const uploadedImageUrl = useMemo(() => {
    return rawImageData?.bytes && rawImageData?.type
      ? URL.createObjectURL(new Blob([rawImageData.bytes], { type: rawImageData.type }))
      : undefined;
  }, [rawImageData]);

  const [isCropping, setIsCropping] = useState(false);

  const onRawLoad: React.ReactEventHandler<HTMLImageElement> = async (e) => {
    const size = {
      height: e.currentTarget.naturalHeight,
      width: e.currentTarget.naturalWidth,
    };

    if (expectedAspectRatio && size.width / size.height !== expectedAspectRatio) {
      setIsCropping(true);
    } else {
      onChange(rawImageData);
    }
  };

  const reset = () => {
    setRawImageData(undefined);
    setIsCropping(false);
    onChange(undefined);
  };

  return (
    <div className="sm:flex sm:items-start">
      <Label htmlFor="file-select" className="sr-only">
        {t('Select a file')}:
      </Label>
      <input
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const imageBytes = new Uint8Array(await file.arrayBuffer());
            if (maxWidth && maxHeight) {
              if (file.type === 'image/svg+xml') {
                setRawImageData({ bytes: imageBytes, type: 'image/svg+xml' });
              } else {
                const imageBlob = new Blob([imageBytes], { type: file.type });

                const resizedData = await fromBlob(imageBlob, 100, maxWidth, maxHeight, 'webp');
                const resizedBytes = new Uint8Array(await resizedData.blob.arrayBuffer());

                setRawImageData({ bytes: resizedBytes, type: 'image/svg+xml' });
              }
            } else {
              setRawImageData({ bytes: imageBytes, type: file.type as ImageContentType });
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            e.target.value = null;
          }
        }}
        name="file-select"
        id="file-select"
        type="file"
        accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml"
        className={`${
          uploadedImageUrl ? 'sr-only' : ''
        } w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
      />
      {uploadedImageUrl ? (
        isCropping ? (
          <div className="relative">
            <ImageCropper
              imageUrl={uploadedImageUrl}
              expectedAspectRatio={expectedAspectRatio}
              onChange={onChange}
            />
            {disableClear ? null : (
              <button
                className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-red-200 p-2"
                onClick={() => reset()}
              >
                <Trash className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <img src={uploadedImageUrl} alt="uploaded image" onLoad={onRawLoad} />
            <ActionButton
              icon={Crop}
              onClick={() => setIsCropping(true)}
              type="secondary"
              size="square"
              className="absolute right-3 top-3 bg-background"
            />
            {disableClear ? null : (
              <button
                className="absolute bottom-3 right-3 cursor-pointer rounded-lg bg-red-200 p-2"
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
};

export default ImageUploadAndCrop;
