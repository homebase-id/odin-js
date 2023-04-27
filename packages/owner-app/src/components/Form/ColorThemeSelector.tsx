import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../helpers/i18n/dictionary';
import usePortal from '../../hooks/portal/usePortal';
import ActionButton from '../ui/Buttons/ActionButton';
import DialogWrapper from '../ui/Dialog/DialogWrapper';
import Triangle from '../ui/Icons/Triangle/Triangle';
import CheckboxToggle from './CheckboxToggle';
import Label from './Label';

interface ColorSet {
  name: string;
  id: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface ColorThemeSelectorProps {
  id: string;
  className?: string;
  name: string;
  defaultValue: ColorSet | undefined;
  onChange: (e: {
    target: {
      name: string;
      value: ColorSet;
    };
  }) => void;
}

const options: ColorSet[] = [
  {
    name: 'Default',
    id: 'default',
    light: {
      'page-background': '246 248 250',
      background: '255 255 255',
      foreground: '11 11 11',
      button: '99 101 241',
      'button-text': '255 255 255',
    },
    dark: {
      'page-background': '17 24 39',
      background: '0 0 0',
      foreground: '250 250 250',
      button: '99 101 141',
      'button-text': '255 255 255',
    },
  },
  {
    name: 'Pink Madness',
    id: 'pink-madness',
    light: {
      'page-background': '246 248 250',
      background: '255 255 255',
      foreground: '11 11 11',
      button: '255 105 180',
      'button-text': '255 255 255',
    },
    dark: {
      'page-background': '17 24 39',
      background: '0 0 0',
      foreground: '250 250 250',
      button: '255 105 180',
      'button-text': '255 255 255',
    },
  },
];

const convertHexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const convertRgbToHex = (r: number, g: number, b: number) => {
  const componentToHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  };

  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
};

const ColorThemeSelector = ({
  id,
  className,
  name,
  defaultValue,
  onChange,
}: ColorThemeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={className ?? ''} id={id}>
        <div
          className="relative cursor-pointer rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex min-w-[6rem] flex-row py-1 px-2">
            <span className="my-auto mr-2 select-none">{(defaultValue || options[0]).name}</span>{' '}
            <Triangle className="my-auto ml-auto h-2 w-2 rotate-90" />
          </div>
        </div>
      </div>
      <ColorThemeSelectorDialog
        isOpen={isOpen}
        defaultValue={defaultValue || options[0]}
        onCancel={() => setIsOpen(false)}
        onChange={(set) => {
          onChange({ target: { name: name, value: set } });
          setIsOpen(false);
        }}
      />
    </>
  );
};

const ColorThemeSelectorDialog = ({
  isOpen,
  onCancel,

  defaultValue,
  onChange,
}: {
  isOpen: boolean;
  onCancel: () => void;

  defaultValue: ColorSet;
  onChange: (colorSet: ColorSet) => void;
}) => {
  const target = usePortal('modal-container');
  const [currValue, setCurrValue] = useState<ColorSet>(defaultValue);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={t('Select Color Theme')} onClose={onCancel}>
      <ul>
        {options.map((colorSet) => (
          <Option
            key={colorSet.id}
            colorSet={colorSet}
            isChecked={currValue?.id === colorSet.id}
            onChange={(set) => setCurrValue(set)}
          />
        ))}
        <FullCustomOption
          key={'custom'}
          colorSet={currValue}
          isChecked={currValue?.id === 'custom'}
          onChange={(set) => setCurrValue(set)}
        />
      </ul>
      <div className="-m-2 flex flex-row-reverse px-4 py-3">
        <ActionButton className="m-2" onClick={() => onChange(currValue)}>
          {'Save'}
        </ActionButton>
        <ActionButton className="m-2" type="secondary" onClick={() => onCancel()}>
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

const Option = ({
  colorSet,
  isChecked,
  onChange,
}: {
  colorSet: ColorSet;
  isChecked: boolean;
  onChange: (colorSet: ColorSet) => void;
}) => {
  return (
    <li
      className={`my-3 w-full cursor-pointer select-none overflow-hidden rounded-lg border dark:border-slate-800 ${
        isChecked && 'bg-slate-50 dark:bg-slate-700'
      }`}
      onClick={() => onChange(colorSet)}
    >
      <div className="my-3 flex flex-row px-4">
        <label htmlFor={colorSet.id} className="w-2/3">
          {colorSet.name}
        </label>
        <CheckboxToggle
          id={colorSet.id}
          checked={isChecked}
          className="pointer-events-none my-auto ml-auto"
          readOnly={true}
        />
      </div>

      <ColorRow row={colorSet.light} className="w-full bg-slate-100 px-4" />
      <ColorRow row={colorSet.dark} className="w-full bg-slate-700 px-4" />
    </li>
  );
};

const ColorRow = ({ row, className }: { row: Record<string, string>; className?: string }) => {
  return (
    <div className={`py-4 ${className ?? ''}`}>
      <div className="-mx-2 flex flex-row">
        {Object.keys(row).map((key) => (
          <div
            className="mx-2 h-8 w-8 border p-1 shadow-sm"
            style={{ backgroundColor: `rgb(${row[key]})` }}
            key={key}
          ></div>
        ))}
      </div>
    </div>
  );
};

const FullCustomOption = ({
  colorSet,
  isChecked,
  onChange,
}: {
  colorSet: ColorSet;
  isChecked: boolean;
  onChange: (colorSet: ColorSet) => void;
}) => {
  const customSet: ColorSet = {
    name: 'Custom',
    id: 'custom',
    dark: {
      ...options[0].dark,
      ...colorSet.dark,
    },
    light: {
      ...options[0].light,
      ...colorSet.light,
    },
  };

  return (
    <li
      className={`my-3 w-full cursor-pointer select-none overflow-hidden rounded-lg border dark:border-slate-800 ${
        isChecked && 'bg-slate-50 dark:bg-slate-700'
      }`}
      onClick={() => onChange(customSet)}
    >
      <div className="my-3 flex flex-row px-4">
        <label htmlFor={customSet.id} className="w-2/3">
          {customSet.name}
        </label>
        <CheckboxToggle
          id={customSet.id}
          checked={isChecked}
          className="pointer-events-none my-auto ml-auto"
          readOnly={true}
        />
      </div>

      <ColorSelectorRow
        row={customSet.light}
        isChecked={isChecked}
        className="w-full bg-slate-100 px-4"
        onChange={(colorRow) => onChange({ ...customSet, light: { ...colorRow } })}
      />
      <ColorSelectorRow
        row={customSet.dark}
        isChecked={isChecked}
        className="w-full bg-slate-700 px-4 text-slate-50"
        onChange={(colorRow) => onChange({ ...customSet, dark: { ...colorRow } })}
      />
    </li>
  );
};

const ColorSelectorRow = ({
  row,
  className,
  isChecked,
  onChange,
}: {
  row: Record<string, string>;
  className?: string;
  isChecked: boolean;
  onChange: (row: Record<string, string>) => void;
}) => {
  return (
    <div className={`py-4 ${className ?? ''}`}>
      <div className="-m-2 flex flex-row flex-wrap">
        {Object.keys(row).map((key) => (
          <div key={key} className={`flex flex-col p-2 ${isChecked ? 'w-1/2' : ''}`}>
            {isChecked && <Label>{t(key)}</Label>}
            <SingleColorSelection
              id={key}
              color={row[key]}
              isChecked={isChecked}
              onChange={(color) => {
                const newRow = { ...row };
                newRow[key] = color;
                onChange(newRow);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const SingleColorSelection = ({
  id,
  color,
  isChecked,
  onChange,
  className,
}: {
  id: string;
  color: string;
  isChecked: boolean;
  onChange: (color: string) => void;
  className?: string;
}) => {
  const colorParts = color.split(' ');
  let defaultVal = '';
  if (colorParts?.length === 3) {
    defaultVal = convertRgbToHex(
      parseInt(colorParts[0]),
      parseInt(colorParts[1]),
      parseInt(colorParts[2])
    );
  }

  return (
    <div className={`${className ?? ''}`}>
      <div className={`relative flex flex-row border shadow-sm`}>
        <div
          className={`h-8 w-8 flex-shrink-0 flex-grow-0 p-1 `}
          style={{ backgroundColor: `rgb(${color})` }}
          key={id}
        ></div>
        {isChecked && (
          <input
            type={'text'}
            className="w-full flex-grow p-1 px-2 py-1 uppercase text-black"
            defaultValue={defaultVal}
            onChange={(e) => {
              const rgb = convertHexToRgb(e.target.value);
              if (rgb) {
                onChange(Object.values(rgb).join(' '));
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ColorThemeSelector;
