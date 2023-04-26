import { useEffect, useRef, useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import useOutsideTrigger from '../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import Arrow from '../ui/Icons/Arrow/Arrow';
import Times from '../ui/Icons/Times/Times';

interface SelectElement {
  value: string;
  label: string;
}

interface MultiSelectProps
  extends Omit<
    Omit<
      React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
      'defaultValue'
    >,
    'onChange'
  > {
  options: SelectElement[];
  defaultValue: SelectElement[];
  onChange: (e: { target: { name: string; value: string[] } }) => void;
}

const MultiSelect = (props: MultiSelectProps) => {
  const { defaultValue, options, onChange, ...otherProps } = props;

  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const [selection, setSelection] = useState<SelectElement[]>(defaultValue ?? []);

  useEffect(() => {
    setSelection(defaultValue ?? []);
  }, [defaultValue]);

  const doSelect = (option: SelectElement) => {
    if (selection.some((selected) => selected.value === option.value)) {
      setSelection([...selection.filter((selected) => selected.value !== option.value)]);
    } else {
      setSelection([...selection, option]);
    }
  };

  const availableOptions = options.filter(
    (option) => !selection.some((selected) => selected.value === option.value)
  );

  useEffect(() => {
    if (!isOpen) {
      // Closing
      onChange({
        target: { name: props.name, value: selection?.map((selected) => selected.value) },
      });
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={wrapperRef}>
      <ul
        className="relative flex min-h-[2.7rem] select-none flex-row flex-wrap py-[6px] px-[10px]"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
          return false;
        }}
      >
        {selection.map((select) => (
          <li
            key={select.value}
            className="my-auto mr-1 mb-1 flex cursor-pointer flex-row bg-slate-100 p-1 text-xs hover:bg-slate-200 dark:bg-slate-700
            dark:hover:bg-slate-500"
            onClick={() => doSelect(select)}
          >
            {select.label}
            <Times className="my-auto ml-1 h-2 w-2" />
          </li>
        ))}
        <Arrow className="my-auto ml-auto h-4 w-4 rotate-90" />
      </ul>
      {isOpen && (
        <ul className="absolute top-full left-0 right-0 z-30 select-none border border-slate-100 bg-white dark:border-slate-700 dark:bg-gray-800">
          {availableOptions?.length ? (
            availableOptions.map((option) => (
              <li
                onClick={() => doSelect(option)}
                key={option.value}
                className="cursor-pointer px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-2 py-1 text-sm">{t('No options')}</li>
          )}
        </ul>
      )}

      <input
        {...otherProps}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
          return false;
        }}
        type={props.type ?? 'input'}
        className={`absolute inset-0 w-full rounded border border-gray-300 bg-transparent py-1 px-3 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${props.className}`}
      />
    </div>
  );
};

export default MultiSelect;
