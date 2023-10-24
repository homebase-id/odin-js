import { ChannelTemplate } from '@youfoundation/js-lib/public';
import { FC } from 'react';
import { t } from '@youfoundation/common-app';
import { TemplateList, TemplateMasonry, TemplateGrid, IconProps } from '@youfoundation/common-app';

export const ChannelTemplateSelector = ({
  name,
  defaultValue,
  onChange,
}: {
  name: string;
  defaultValue: string | undefined;
  onChange: (e: {
    target: {
      name: string;
      value: string;
    };
  }) => void;
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 py-5 text-center text-gray-500 md:grid-cols-3 md:gap-5">
      <Template
        name={name}
        icon={TemplateList}
        label={t('List')}
        value={ChannelTemplate.ClassicBlog}
        onChange={onChange}
        checked={defaultValue === ChannelTemplate.ClassicBlog + ''}
      />
      <Template
        name={name}
        icon={TemplateGrid}
        label={t('Grid')}
        value={ChannelTemplate.LargeCards}
        onChange={onChange}
        checked={defaultValue === ChannelTemplate.LargeCards + ''}
      />
      <Template
        name={name}
        icon={TemplateMasonry}
        label={t('Masonry')}
        value={ChannelTemplate.MasonryLayout}
        onChange={onChange}
        checked={defaultValue === ChannelTemplate.MasonryLayout + ''}
      />
    </div>
  );
};

const Template = ({
  name,
  icon,
  label,
  value,
  onChange,
  checked,
}: {
  name: string;
  icon: FC<IconProps>;
  label: string;
  value: string | number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  checked: boolean;
}) => {
  return (
    <div className="flex flex-col">
      <input
        type="radio"
        id={value + ''}
        name={name}
        value={value}
        className="peer sr-only"
        onChange={onChange}
        defaultChecked={checked}
      />
      <label
        htmlFor={value + ''}
        className="flex flex-grow cursor-pointer flex-col rounded-md border-2 border-slate-100 bg-slate-100 p-2 peer-checked:border-indigo-500 dark:border-slate-900 dark:bg-slate-900"
      >
        <div className="flex flex-grow flex-col justify-center">
          {icon({
            className: `mx-auto h-auto w-full ${value !== '0' ? 'max-w-[10rem]' : 'max-w-[5rem]'}`,
          })}
        </div>
        <p>{label}</p>
      </label>
    </div>
  );
};
