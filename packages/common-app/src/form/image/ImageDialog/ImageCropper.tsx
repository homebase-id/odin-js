import Cropper from 'react-cropper';
import './cropper.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { t, useDebounce } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';

interface ImageCropperProps {
  imageUrl: string;
  expectedAspectRatio?: number;
  onChange?: (imageData: Blob | undefined) => void;
}

export interface CropperRef extends HTMLImageElement {
  cropper: Cropper;
}

const OUTPUT_MIME_TYPE = 'image/webp';

export const GetCroppedData = (
  cropperRef: React.RefObject<CropperRef>
): Promise<Blob | undefined> => {
  return new Promise((resolve) => {
    const imageElement = cropperRef?.current;
    const cropper = imageElement?.cropper;

    if (!cropper) {
      resolve(undefined);
      return;
    }

    cropper.getCroppedCanvas().toBlob((blob) => {
      if (!blob) return;

      resolve(blob);
    }, OUTPUT_MIME_TYPE);
  });
};

const ImageCropper = forwardRef<CropperRef, ImageCropperProps>(
  ({ imageUrl, expectedAspectRatio, onChange }, ref) => {
    const internalRef = useRef<CropperRef>(null);
    useImperativeHandle<CropperRef | null, CropperRef | null>(ref, () => internalRef.current);

    const [aspectRatio, setAspectRatio] = useState<number>();

    const onCrop = onChange
      ? useDebounce(() => GetCroppedData(internalRef).then((data) => onChange && onChange(data)), {
          timeoutMillis: 750,
        })
      : undefined;

    useEffect(() => {
      if (expectedAspectRatio) return;

      if (aspectRatio) internalRef?.current?.cropper.setAspectRatio(aspectRatio);
      else internalRef?.current?.cropper.setAspectRatio(-1);
    }, [aspectRatio]);

    return (
      <>
        <Cropper
          ref={internalRef}
          src={imageUrl}
          // Cropper.js options
          aspectRatio={expectedAspectRatio}
          guides={false}
          crop={onCrop}
          viewMode={3}
          dragMode="move"
          autoCropArea={1}
          rotatable={false}
          zoomable={false}
        />
        {!expectedAspectRatio ? (
          <div className="py-5">
            <Label>{t('Aspect ratio')}:</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <AspectOption
                val={undefined}
                currentVal={aspectRatio}
                onChange={setAspectRatio}
                label={t('Free')}
              />
              <AspectOption
                val={1}
                currentVal={aspectRatio}
                onChange={setAspectRatio}
                label={t('Square')}
              />
              <AspectOption
                val={4 / 3}
                currentVal={aspectRatio}
                onChange={setAspectRatio}
                label={t('4 / 3')}
              />
              <AspectOption
                val={16 / 9}
                currentVal={aspectRatio}
                onChange={setAspectRatio}
                label={t('16 / 9')}
              />
            </div>
          </div>
        ) : null}
      </>
    );
  }
);

ImageCropper.displayName = 'ImageCropper';
export { ImageCropper };

const AspectOption = ({
  val,
  label,
  onChange,
  currentVal,
}: {
  val: number | undefined;
  label: string;
  onChange: (val: number | undefined) => void;
  currentVal: number | undefined;
}) => {
  const isActive = val === currentVal;
  return (
    <button
      onClick={() => onChange(currentVal === val ? undefined : val)}
      className={`rounded-md px-3 py-2 ${
        isActive ? 'bg-indigo-400 text-white dark:bg-indigo-800 dark:text-white' : 'opacity-50'
      }`}
    >
      {label}
    </button>
  );
};
