import { Block, EmojiSelector, t } from '@youfoundation/common-app';
import ImageSelector from '@youfoundation/common-app/src/form/image/ImageSelector';
import { AccessControlList, SecurityGroupType, TargetDrive } from '@youfoundation/js-lib/core';
import { ReactNode } from 'react';

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

  return (
    <div className="grid grid-cols-2 gap-2 py-5 text-center text-gray-500 md:grid-cols-3 md:gap-5">
      <FaviconOption isActive={valueObject && 'emoji' in valueObject} label={t('Emoji')}>
        <EmojiSelector
          className="mx-auto text-2xl"
          onInput={(val) =>
            onChange({
              target: {
                name: props.name || '',
                value: { emoji: val },
              },
            })
          }
          defaultValue={valueObject && 'emoji' in valueObject ? valueObject.emoji : undefined}
        />
      </FaviconOption>
      <FaviconOption isActive={valueObject && 'fileId' in valueObject} label={t('Custom image')}>
        <div className="mx-auto">
          <ImageSelector
            {...props}
            defaultValue={valueObject && 'fileId' in valueObject ? valueObject.fileId : undefined}
            acl={{ requiredSecurityGroup: SecurityGroupType.Anonymous }}
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
            sizeClass="aspect-square w-[10rem]"
          />
        </div>
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
        <Block className="mx-auto h-auto w-full max-w-[5rem]" />
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
      className={`flex flex-col rounded-md border-2 p-2 ${
        isActive
          ? 'border-indigo-500 bg-white dark:bg-black'
          : 'border-slate-100 bg-slate-100 dark:border-slate-900 dark:bg-slate-900'
      }`}
      onClick={onClick}
    >
      <div className="flex flex-grow flex-col justify-center">{children}</div>
      <p>{label}</p>
    </div>
  );
};

export default FaviconSelector;
