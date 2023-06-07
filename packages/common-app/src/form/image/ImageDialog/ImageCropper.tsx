import Cropper from 'react-cropper';
import './cropper.css';
import { useEffect, useRef, useState } from 'react';
import { t } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { ImageContentType } from '@youfoundation/js-lib/core';

interface ImageCropperProps {
  imageUrl: string;
  expectedAspectRatio?: number;
  onChange?: (imageData: { bytes: Uint8Array; type: ImageContentType }) => void;
}

interface CropperRef extends HTMLImageElement {
  cropper: Cropper;
}

const OUTPUT_MIME_TYPE = 'image/webp';

export const ImageCropper = ({ imageUrl, expectedAspectRatio, onChange }: ImageCropperProps) => {
  const cropperRef = useRef<CropperRef>(null);
  const [aspectRatio, setAspectRatio] = useState<number>();

  const onCrop = () => {
    const imageElement = cropperRef?.current;
    const cropper = imageElement?.cropper;

    cropper?.getCroppedCanvas().toBlob((blob) => {
      if (!blob) {
        return;
      }

      new Blob([blob], { type: OUTPUT_MIME_TYPE }).arrayBuffer().then((buffer) => {
        const contentByteArray = new Uint8Array(buffer);
        onChange && onChange({ bytes: contentByteArray, type: OUTPUT_MIME_TYPE });
      });
    }, OUTPUT_MIME_TYPE);
  };

  useEffect(() => {
    if (expectedAspectRatio) {
      return;
    }
    if (aspectRatio) {
      cropperRef?.current?.cropper.setAspectRatio(aspectRatio);
    } else {
      cropperRef?.current?.cropper.setAspectRatio(-1);
    }
  }, [aspectRatio]);

  return (
    <>
      <Cropper
        ref={cropperRef}
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
};

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
