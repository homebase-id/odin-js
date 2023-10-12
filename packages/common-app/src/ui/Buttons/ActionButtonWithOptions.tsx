import { FC, useRef, useState } from 'react';
import {
  ActionButton,
  ActionButtonProps,
  ArrowDown,
  useMostSpace,
  useOutsideTrigger,
} from '@youfoundation/common-app';

interface ActionButtonWithOptionsProps extends Omit<Omit<ActionButtonProps, 'icon'>, 'onClick'> {
  options: { value: string; name: string; group?: string }[];
  onClick: (value: string) => void;
}

export const ActionButtonWithOptions: FC<ActionButtonWithOptionsProps> = ({
  options,
  onClick,
  className,
  ...actionButtonProps
}) => {
  const wrapperRef = useRef(null);
  useOutsideTrigger(options ? wrapperRef : undefined, () => setIsOpen(false));
  const { verticalSpace } = useMostSpace(wrapperRef);

  const [isOpen, setIsOpen] = useState(false);

  const groups: string[] = options.reduce((prevVal, curVal) => {
    if (!curVal.group) {
      return prevVal;
    }
    if (prevVal.indexOf(curVal.group) !== -1) {
      return prevVal;
    }
    return [...prevVal, curVal.group];
  }, [] as string[]);

  const optionGroups = groups.map((group) => {
    return { name: group, options: options.filter((option) => option.group === group) };
  });

  const renderOptions = (options: { value: string; name: string; group?: string }[]) => {
    return options.map((option) => (
      <li
        onClick={() => onClick(option.value)}
        className="cursor-pointer px-2 py-2 leading-tight hover:bg-slate-200 dark:hover:bg-slate-700"
        key={option.value}
      >
        {option.name}
      </li>
    ));
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={wrapperRef}>
      <ActionButton
        {...actionButtonProps}
        className="w-full sm:w-full"
        onClick={() => setIsOpen(!isOpen)}
        icon={ArrowDown}
      />
      {optionGroups?.length ? (
        <ul
          className={`absolute ${
            verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
          } right-0 w-full shadow-md ${
            isOpen ? 'max-h-[15.5rem]' : 'max-h-0'
          } overflow-auto bg-white text-black dark:bg-slate-900 dark:text-white`}
        >
          {optionGroups.map((group) => (
            <li className="px-2 py-1" key={group.name}>
              <p className="font-bold text-slate-400 dark:text-slate-500">{group.name}</p>
              <ul>{renderOptions(group.options)}</ul>
            </li>
          ))}
        </ul>
      ) : options ? (
        <ul
          className={`absolute ${
            verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
          } right-0 w-full ${
            isOpen ? 'max-h-[15rem]' : 'max-h-0'
          } overflow-auto bg-white text-black`}
        >
          {renderOptions(options)}
        </ul>
      ) : null}
    </div>
  );
};
