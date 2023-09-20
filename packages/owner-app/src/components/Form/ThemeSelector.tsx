import { HomePageTheme } from '@youfoundation/js-lib/public';
import { FC } from 'react';
import { t } from '@youfoundation/common-app';
import {
  Block,
  HorizontalPosts,
  VerticalPosts,
  Links,
  CoverPage,
  IconProps,
} from '@youfoundation/common-app';

const ThemeSelector = ({
  name,
  defaultValue,
  onChange,
  id = '',
}: {
  name: string;
  defaultValue: string | undefined;
  onChange: (e: {
    target: {
      name: string;
      value: string;
    };
  }) => void;
  id?: string;
}) => {
  const doChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange({
      target: {
        name: name,
        value: e.target.value,
      },
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2 py-5 text-center text-gray-500 md:grid-cols-5 md:gap-5">
      <Theme
        id={id + HomePageTheme.VerticalPosts}
        name={id + name}
        icon={VerticalPosts}
        label={t('Vertical Posts')}
        value={HomePageTheme.VerticalPosts}
        onChange={doChange}
        checked={defaultValue === HomePageTheme.VerticalPosts + ''}
      />
      <Theme
        id={id + HomePageTheme.HorizontalPosts}
        name={id + name}
        icon={HorizontalPosts}
        label={t('Horizontal Posts')}
        value={HomePageTheme.HorizontalPosts}
        onChange={doChange}
        checked={defaultValue === HomePageTheme.HorizontalPosts + ''}
      />
      <Theme
        id={id + HomePageTheme.CoverPage}
        name={id + name}
        icon={CoverPage}
        label={t('Cover Page')}
        value={HomePageTheme.CoverPage}
        onChange={doChange}
        checked={defaultValue === HomePageTheme.CoverPage + ''}
      />
      <Theme
        id={id + HomePageTheme.Links}
        name={id + name}
        icon={Links}
        label={t('Link Page')}
        value={HomePageTheme.Links}
        onChange={doChange}
        checked={defaultValue === HomePageTheme.Links + ''}
      />
      <Theme
        id={id + '0'}
        name={id + name}
        icon={Block}
        label={t('Disable public site')}
        value={'0'}
        onChange={doChange}
        checked={defaultValue === '0'}
      />
    </div>
  );
};

const Theme = ({
  name,
  id,
  icon,
  label,
  value,
  onChange,
  checked,
}: {
  name: string;
  id: string;
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
        id={id || value + ''}
        name={name}
        value={value}
        className="peer sr-only"
        onChange={onChange}
        defaultChecked={checked}
      />
      <label
        htmlFor={id || value + ''}
        className="flex flex-grow cursor-pointer flex-col rounded-md border-2 border-slate-100 bg-slate-100 p-2 peer-checked:border-indigo-500 peer-checked:bg-white dark:border-slate-900 dark:bg-slate-900 peer-checked:dark:bg-black"
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

export default ThemeSelector;
