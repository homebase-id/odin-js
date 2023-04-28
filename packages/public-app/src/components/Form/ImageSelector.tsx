import { AccessControlList, ImageUploadResult, TargetDrive } from '@youfoundation/js-lib';
import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import ConfirmDialog from '../Dialog/ConfirmDialog/ConfirmDialog';
import { Exclamation } from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Trash } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import ImageDialog from '../RichTextEditor/ImageDialog/ImageDialog';
import useImage from '../../hooks/image/useImage';

interface ImageSelectorProps
  extends Omit<
    React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
    'onChange'
  > {
  targetDrive: TargetDrive;
  acl: AccessControlList;
  onChange: (event: { target: { name: string; value: ImageUploadResult | undefined } }) => void;
  sizeClass?: string;
  label?: string;
}

const ImageSelector = ({
  targetDrive,
  acl,
  onChange,
  defaultValue,
  name,
  sizeClass: externalSizeClass,
  label,
}: ImageSelectorProps) => {
  const {
    fetch: { data: imageData, isLoading },
    remove: { mutateAsync: removeImage, error: removeError },
  } = useImage(undefined, typeof defaultValue === 'string' ? defaultValue : undefined, targetDrive);
  const [isEdit, setIsEdit] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const removeData = async () => {
    const fileId = typeof defaultValue === 'string' ? defaultValue : undefined;
    if (fileId && name) {
      await removeImage({
        fileId: fileId,
        targetDrive: targetDrive,
      });
      onChange({ target: { name: name, value: undefined } });
    }
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
            <button
              className="absolute right-2 top-2 rounded-lg bg-white p-2"
              onClick={(e) => {
                e.preventDefault();
                setIsEdit(true);
                return false;
              }}
            >
              <Pencil className="h-4 w-4 text-black" />
            </button>
            <button
              className="absolute bottom-2 right-2 rounded-lg bg-red-200 p-2"
              onClick={() => {
                setNeedsConfirmation(true);
                return false;
              }}
            >
              <Trash className="h-4 w-4 text-black" />
            </button>
            <img
              src={imageData?.url}
              alt={imageData?.url}
              className={sizeClass}
              onClick={() => {
                setIsEdit(true);
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className={`${sizeClass} relative flex cursor-pointer bg-slate-100 dark:bg-slate-700`}
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
        isOpen={isEdit}
        targetDrive={targetDrive}
        title={t('Upload image')}
        confirmText={t('Add')}
        onCancel={() => setIsEdit(false)}
        onConfirm={(uploadResult) => {
          if (uploadResult && name) {
            onChange({ target: { name: name, value: uploadResult } });
            setIsEdit(false);
          }
        }}
      />
      <ErrorNotification error={removeError} />
      <ConfirmDialog
        title="Remove Current Image"
        confirmText="Permanently remove"
        needConfirmation={needsConfirmation}
        onConfirm={removeData}
        onCancel={() => {
          setNeedsConfirmation(false);
        }}
      >
        <p className="text-sm text-gray-500">
          {t('Are you sure you want to remove the current file? This action cannot be undone.')}
        </p>
      </ConfirmDialog>
    </>
  );
};

export default ImageSelector;
