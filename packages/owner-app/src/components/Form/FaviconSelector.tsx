import { Block, EmojiSelector, t, ImageSelector } from '@youfoundation/common-app';
import { AccessControlList, TargetDrive } from '@youfoundation/js-lib/core';
import { ReactNode, useState } from 'react';

interface FaviconSelectorProps {
  name?: string;
  defaultValue: unknown;
  acl: AccessControlList;
  targetDrive: TargetDrive;
  onChange: (event: { target: { name: string; value: unknown | undefined } }) => void;
}

const FaviconSelector = ({ onChange, defaultValue, ...props }: FaviconSelectorProps) => {
  const valueObject: { fileId: string } | { emoji: string } | undefined = defaultValue as
    | { fileId: string }
    | { emoji: string }
    | undefined;

  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-2 py-5 text-center text-gray-500 md:grid-cols-3 md:gap-5">
      <FaviconOption
        isActive={valueObject && 'emoji' in valueObject}
        label={t('Emoji')}
        onClick={() => setIsEmojiOpen(true)}
      >
        <EmojiSelector
          wrapperClassName="relative flex flex-row justify-center items-center"
          className="text-4xl text-foreground/70 hover:text-opacity-100"
          onInput={(val) =>
            onChange({
              target: {
                name: props.name || '',
                value: { emoji: val },
              },
            })
          }
          isOpen={isEmojiOpen}
          onClose={() => setIsEmojiOpen(false)}
          defaultValue={valueObject && 'emoji' in valueObject ? valueObject.emoji : '😀'}
        />
      </FaviconOption>
      <FaviconOption
        isActive={valueObject && 'fileId' in valueObject}
        label={t('Custom image')}
        onClick={() => setIsImageOpen(true)}
      >
        <ImageSelector
          {...props}
          label=""
          defaultValue={valueObject && 'fileId' in valueObject ? valueObject.fileId : undefined}
          onChange={(e) => {
            onChange({
              target: {
                name: e.target.name,
                value: e.target.value?.fileId
                  ? {
                      fileId: e.target.value.fileId,
                    }
                  : undefined,
              },
            });
          }}
          maxHeight={512}
          maxWidth={512}
          expectedAspectRatio={1}
          sizeClass="w-full"
          isOpen={isImageOpen}
          onClose={() => setIsImageOpen(false)}
        />
      </FaviconOption>
      <FaviconOption
        isActive={!valueObject}
        label={t('None')}
        onClick={() =>
          onChange({
            target: {
              name: props.name || '',
              value: undefined,
            },
          })
        }
      >
        <Block className="mx-auto h-8 w-8 cursor-pointer" />
      </FaviconOption>
    </div>
  );
};

const FaviconOption = ({
  children,
  isActive,
  label,
  onClick,
}: {
  children: ReactNode;
  isActive?: boolean;
  label: string;
  onClick?: () => void;
}) => {
  return (
    <div
      className={`flex cursor-pointer flex-col rounded-md border-2 ${
        isActive
          ? 'border-indigo-500 bg-white dark:bg-black'
          : 'border-slate-100 bg-slate-100 dark:border-slate-900 dark:bg-slate-900'
      }`}
      onClick={onClick}
    >
      <div className="relative flex flex-grow flex-col justify-center px-2 py-4">{children}</div>
      <p className="p-2 pt-0">{label}</p>
    </div>
  );
};

export default FaviconSelector;
