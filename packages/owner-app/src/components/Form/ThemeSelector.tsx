import { HomePageTheme } from '@youfoundation/js-lib';
import { FC } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import {
  Block,
  HorizontalPosts,
  VerticalPosts,
  CoverPage,
  IconProps,
} from '@youfoundation/common-app';

const ThemeSelector = ({
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
    <div className="grid grid-cols-2 gap-2 py-5 text-center text-gray-500 md:grid-cols-4 md:gap-5">
      <Theme
        name={name}
        icon={VerticalPosts}
        label={t('Vertical Posts')}
        value={HomePageTheme.SocialClassic}
        onChange={onChange}
        checked={defaultValue === HomePageTheme.SocialClassic + ''}
      />
      <Theme
        name={name}
        icon={HorizontalPosts}
        label={t('Horizontal Posts')}
        value={HomePageTheme.ContentProducer}
        onChange={onChange}
        checked={defaultValue === HomePageTheme.ContentProducer + ''}
      />
      <Theme
        name={name}
        icon={CoverPage}
        label={t('Cover Page')}
        value={HomePageTheme.CoverPage}
        onChange={onChange}
        checked={defaultValue === HomePageTheme.CoverPage + ''}
      />
      <Theme
        name={name}
        icon={Block}
        label={t('Disable public site')}
        value={'0'}
        onChange={onChange}
        checked={defaultValue === '0'}
      />
    </div>
  );
};

const Theme = ({
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

export default ThemeSelector;
