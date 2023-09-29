import { ReactNode, useRef, useState } from 'react';
import { Check, t, useOutsideTrigger } from '@youfoundation/common-app';
import { Triangle } from '@youfoundation/common-app';
import { CirclePermissionType } from '@youfoundation/js-lib/network';

const PermissionFlagsEditor = ({
  className,
  onChange,
  defaultValue,
}: {
  className: string;
  onChange?: (value: number[]) => void;
  defaultValue: number[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setInnerValue] = useState(defaultValue);
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

  const currentValue =
    defaultValue?.length >= 2
      ? 'Multiple'
      : (defaultValue[0] && t(CirclePermissionType[defaultValue[0]])) ?? t(CirclePermissionType[0]);

  const setValue = (value: number[]) => {
    setInnerValue(value);
    onChange && onChange(value);
  };

  const numericPermissionLevels = Object.values(CirclePermissionType).filter(
    (v) => typeof v === 'number'
  ) as number[];

  return (
    <div className={className ?? ''}>
      <div
        className="relative cursor-pointer rounded-md bg-slate-100 dark:bg-slate-800"
        onClick={() => setIsOpen(!isOpen)}
        ref={wrapperRef}
      >
        <div className="flex min-w-[6rem] flex-row px-2 py-1">
          <span className="my-auto mr-2 select-none">{currentValue}</span>{' '}
          <Triangle className="my-auto ml-auto h-2 w-2 rotate-90" />
        </div>
        <ul
          className={`absolute right-0 top-[100%] overflow-hidden bg-white dark:bg-slate-800 ${
            isOpen
              ? 'z-10 max-h-[30rem] border border-slate-100 py-3 shadow-2xl dark:border-slate-700'
              : 'max-h-0'
          }`}
        >
          {numericPermissionLevels.map((level) => (
            <Option
              key={level}
              isChecked={value.some((val) => val === level) || (value.length === 0 && level === 0)}
              onChange={() =>
                value.some((val) => val === level)
                  ? setValue(value.filter((val) => val !== level))
                  : level !== 0
                  ? setValue([...value, level])
                  : setValue([])
              }
            >
              {t(CirclePermissionType[level])}
            </Option>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Option = ({
  className,
  isChecked,
  children,
  onChange,
}: {
  className?: string;
  isChecked: boolean;
  children: ReactNode;
  onChange: () => void;
}) => {
  return (
    <li
      className={`flex min-w-[16rem] cursor-pointer select-none flex-row px-4 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
      onClick={onChange}
    >
      <Check
        className={`my-auto mr-3 h-4 w-4 flex-shrink-0 ${
          isChecked ? 'text-slate-700 dark:text-slate-200' : 'text-transparent'
        }`}
      />{' '}
      <span className={`mr-auto block h-full py-1`}>{children}</span>
    </li>
  );
};

export default PermissionFlagsEditor;
