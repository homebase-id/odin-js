import { ReactNode, useRef, useState } from 'react';
import useOutsideTrigger from '../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import Check from '../ui/Icons/Check/Check';
import Triangle from '../ui/Icons/Triangle/Triangle';

const PermissionFlagsEditor = ({
  className,
  permissionLevels,
  onChange,
  defaultValue,
}: {
  className: string;
  permissionLevels: { name: string; value: number }[];
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
      : (defaultValue?.[0]
          ? permissionLevels.find((level) => level.value === defaultValue[0])?.name
          : permissionLevels[0].name) ?? permissionLevels[0].name;

  const setValue = (value: number[]) => {
    setInnerValue(value);
    onChange && onChange(value);
  };

  return (
    <div className={className ?? ''}>
      <div
        className="relative cursor-pointer rounded-md bg-slate-100 dark:bg-slate-800"
        onClick={() => setIsOpen(!isOpen)}
        ref={wrapperRef}
      >
        <div className="flex min-w-[6rem] flex-row py-1 px-2">
          <span className="my-auto mr-2 select-none">{currentValue}</span>{' '}
          <Triangle className="my-auto ml-auto h-2 w-2 rotate-90" />
        </div>
        <ul
          className={`absolute top-[100%] right-0 overflow-hidden bg-white dark:bg-slate-800 ${
            isOpen
              ? 'z-10 max-h-[30rem] border border-slate-100 py-3 shadow-2xl dark:border-slate-700'
              : 'max-h-0'
          }`}
        >
          {permissionLevels.map((level) => (
            <Option
              key={level.value}
              isChecked={
                value.some((val) => val === level.value) ||
                (value.length === 0 && level.value === 0)
              }
              onChange={() =>
                value.some((val) => val === level.value)
                  ? setValue(value.filter((val) => val !== level.value))
                  : level.value !== 0
                  ? setValue([...value, level.value])
                  : setValue([])
              }
            >
              {level.name}
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
      className={`flex min-w-[16rem] cursor-pointer select-none flex-row py-1 px-4 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
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
