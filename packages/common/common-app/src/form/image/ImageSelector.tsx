import { useEffect, useState } from 'react';
import { ActionButton } from '../../ui/Buttons/ActionButton';
import { Pencil } from '../../ui/Icons/Pencil';
import { Trash } from '../../ui/Icons/Trash';
import { Exclamation } from '../../ui/Icons/Exclamation';
import { ImageDialog } from './ImageDialog/ImageDialog';
import { t } from '../../helpers/i18n/dictionary';

interface ImageSelectorProps
  extends Omit<
    React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
    'onChange' | 'defaultValue'
  > {
  defaultValue?: Blob | string;

  onChange: (event: { target: { name: string; value: Blob | undefined } }) => void;
  expectedAspectRatio?: number;

  maxHeight?: number;
  maxWidth?: number;

  sizeClass?: string;
  label?: string;

  disabled?: boolean;

  isOpen?: boolean;
  onClose?: () => void;
}

export const ImageSelector = ({
  onChange,
  defaultValue,
  name,
  expectedAspectRatio,
  maxHeight,
  maxWidth,
  sizeClass: externalSizeClass,
  label,
  disabled,
  isOpen: isDefaultOpen,
  onClose,
  ...props
}: ImageSelectorProps) => {
  const [optimisticValue, setOptimisticValue] = useState<string>();
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => setIsEdit(!!isDefaultOpen), [isDefaultOpen]);
  useEffect(() => (!isEdit && onClose ? onClose() : undefined), [isEdit]);

  const removeData = async () => {
    onChange({ target: { name: name || '', value: undefined } });
  };

  const sizeClass = externalSizeClass ?? 'aspect-square max-w-[20rem]';

  // Keep the optimistic value in memory, so we avoid having a flash between the optimistic value and the new value
  useEffect(() => {
    if (defaultValue instanceof Blob) setOptimisticValue(URL.createObjectURL(defaultValue));
    else if (defaultValue === undefined) setOptimisticValue(undefined);
  }, [defaultValue]);

  const imageUrl = optimisticValue || (typeof defaultValue === 'string' ? defaultValue : undefined);

  return (
    <>
      {imageUrl ? (
        <div className="flex">
          <div className="relative mr-auto">
            <ActionButton
              className="absolute right-2 top-2"
              size="square"
              type="secondary"
              id={props.id}
              onClick={(e) => {
                e.preventDefault();
                setIsEdit(true);
                return false;
              }}
              disabled={disabled}
            >
              <Pencil className="h-5 w-5 " />
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
              disabled={disabled}
            >
              <Trash className="h-5 w-5 " />
            </ActionButton>
            <img src={imageUrl} className="max-h-[20rem]" onClick={() => setIsEdit(true)} />
          </div>
        </div>
      ) : (
        <div
          className={`relative flex ${sizeClass} cursor-pointer flex-col bg-slate-100 dark:bg-slate-700`}
          onClick={(e) => {
            e.preventDefault();
            setIsEdit(true);
          }}
        >
          <Exclamation className="m-auto h-8 w-8" />
          <p className="text-center text-slate-400">{label ?? t('No image selected')}</p>
        </div>
      )}

      <ImageDialog
        isOpen={isEdit && !disabled}
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
    </>
  );
};
