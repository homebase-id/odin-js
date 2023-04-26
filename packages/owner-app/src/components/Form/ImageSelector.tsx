import { AccessControlList, TargetDrive } from '@youfoundation/js-lib';
import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import useImage from '../../hooks/media/useImage';
import Exclamation from '../ui/Icons/Exclamation/Exclamation';
import Pencil from '../ui/Icons/Pencil/Pencil';
import Trash from '../ui/Icons/Trash/Trash';
import ImageDialog from '../Dialog/ImageDialog/ImageDialog';
import ErrorNotification from '../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../ui/Buttons/ActionButton';

interface ImageSelectorProps
  extends React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  targetDrive?: TargetDrive;
  acl: AccessControlList;
  onChange: (event: { target: { name: string; value: string } }) => void;
  expectedAspectRatio?: number;

  maxHeight?: number;
  maxWidth?: number;

  sizeClass?: string;
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
}: ImageSelectorProps) => {
  const {
    fetch: { data: imageUrl, isLoading },
    remove: { mutateAsync: removeImage, error: removeError },
  } = useImage(typeof defaultValue === 'string' ? defaultValue : undefined, targetDrive);
  const [isEdit, setIsEdit] = useState(false);

  const removeData = async () => {
    await removeImage({
      fileId: typeof defaultValue === 'string' ? defaultValue : undefined,
      targetDrive: targetDrive,
    });
    onChange({ target: { name: name, value: undefined } });
  };

  // const sizeClass = 'aspect-square max-w-[20rem]';
  const sizeClass = externalSizeClass ?? 'aspect-square max-w-[20rem]';

  if (isLoading && defaultValue) {
    return <div className={`${sizeClass} animate-pulse bg-slate-100 dark:bg-slate-700`}></div>;
  }

  return (
    <>
      {imageUrl ? (
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
            >
              <Pencil className="h-4 w-4 " />
            </ActionButton>
            <ActionButton
              className="absolute bottom-2 right-2"
              size="square"
              type="remove"
              confirmOptions={{
                title: t('Remove Current Image'),
                body: t(
                  'Are you sure you want to remove the current file? This action cannot be undone.'
                ),
                buttonText: t('Permanently remove'),
              }}
              onClick={removeData}
            >
              <Trash className="h-4 w-4 " />
            </ActionButton>
            <img
              src={imageUrl}
              alt={imageUrl}
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
            {t('No image selected')}
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
        expectedAspectRatio={expectedAspectRatio}
        maxHeight={maxHeight}
        maxWidth={maxWidth}
        onConfirm={(uploadResult) => {
          onChange({ target: { name: name, value: uploadResult.fileId } });
          setIsEdit(false);
        }}
      />
      <ErrorNotification error={removeError} />
    </>
  );
};

export default ImageSelector;
