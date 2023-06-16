import { AccessControlList, ImageUploadResult, TargetDrive } from '@youfoundation/js-lib/core';
import { useState } from 'react';
import { ActionButton, t, useImage } from '@youfoundation/common-app';
import { Exclamation } from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import { ErrorNotification, ImageDialog } from '@youfoundation/common-app';

interface ImageSelectorProps
  extends Omit<
    React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
    'onChange'
  > {
  targetDrive: TargetDrive;
  acl: AccessControlList;
  onChange: (event: { target: { name: string; value: ImageUploadResult | undefined } }) => void;
  expectedAspectRatio?: number;

  maxHeight?: number;
  maxWidth?: number;

  sizeClass?: string;
  label?: string;

  disabled?: boolean;
}

const ImageSelector = ({
  targetDrive,
  acl,
  onChange,
  defaultValue,
  name,
  expectedAspectRatio,
  maxHeight,
  maxWidth,
  sizeClass: externalSizeClass,
  label,
  disabled,
}: ImageSelectorProps) => {
  const {
    fetch: { data: imageData, isLoading },
    remove: { mutateAsync: removeImage, error: removeError },
  } = useImage(undefined, typeof defaultValue === 'string' ? defaultValue : undefined, targetDrive);
  const [isEdit, setIsEdit] = useState(false);

  const removeData = async () => {
    if (typeof defaultValue !== 'string') return;

    await removeImage({
      fileId: defaultValue,
      targetDrive: targetDrive,
    });
    onChange({ target: { name: name || '', value: undefined } });
  };

  // const sizeClass = 'aspect-square max-w-[20rem]';
  const sizeClass = externalSizeClass ?? 'aspect-square max-w-[20rem]';

  if (isLoading && defaultValue) {
    return <div className={`${sizeClass} animate-pulse bg-slate-100 dark:bg-slate-700`}></div>;
  }

  return (
    <>
      {imageData ? (
        <div className="flex">
          <div className="relative mr-auto">
            <ActionButton
              className="absolute right-2 top-2"
              size="square"
              type="secondary"
              onClick={(e) => {
                e.preventDefault();
                setIsEdit(true);
                return false;
              }}
              isDisabled={disabled}
            >
              <Pencil className="h-4 w-4 " />
            </ActionButton>
            <ActionButton
              className="absolute bottom-2 right-2"
              size="square"
              type="remove"
              confirmOptions={{
                type: 'critical',
                title: t('Remove Current Image'),
                body: t(
                  'Are you sure you want to remove the current file? This action cannot be undone.'
                ),
                buttonText: t('Permanently remove'),
              }}
              onClick={removeData}
              isDisabled={disabled}
            >
              <Trash className="h-4 w-4 " />
            </ActionButton>
            <img
              src={imageData.url}
              alt={imageData.url}
              className="max-h-[20rem]"
              onClick={() => {
                setIsEdit(true);
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className={`relative flex ${sizeClass} cursor-pointer bg-slate-100 dark:bg-slate-700`}
          onClick={(e) => {
            e.preventDefault();
            setIsEdit(true);
          }}
        >
          <Exclamation className="m-auto h-8 w-8" />
          <p className="absolute inset-0 top-auto pb-5 text-center text-slate-400">
            {label ?? t('No image selected')}
          </p>
        </div>
      )}

      <ImageDialog
        acl={acl}
        isOpen={isEdit && !disabled}
        targetDrive={targetDrive}
        title={t('Upload image')}
        confirmText={t('Add')}
        onCancel={() => setIsEdit(false)}
        expectedAspectRatio={expectedAspectRatio}
        maxHeight={maxHeight}
        maxWidth={maxWidth}
        onConfirm={(uploadResult) => {
          onChange({ target: { name: name || '', value: uploadResult } });
          setIsEdit(false);
        }}
      />
      <ErrorNotification error={removeError} />
    </>
  );
};

export default ImageSelector;
