import { FC, useRef, useState } from 'react';
import ActionButton, { ActionButtonProps } from './ActionButton';
import { useOutsideTrigger } from '@youfoundation/common-app';

interface ActionButtonWithOptionsProps extends Omit<ActionButtonProps, 'icon'> {
  options: {
    name: string;
    group?: string;
    onClick?: React.MouseEventHandler<HTMLElement>;
  }[];
}

const ActionButtonWithOptions: FC<ActionButtonWithOptionsProps> = ({
  options,
  className,
  ...actionButtonProps
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(options ? wrapperRef : undefined, () => setIsOpen(false));

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

  const renderOptions = (
    options: {
      name: string;
      group?: string;
      onClick?: React.MouseEventHandler<HTMLElement>;
    }[]
  ) => {
    return options.map((option) => (
      <li
        onClick={option.onClick}
        className="cursor-pointer px-2 py-1 hover:bg-slate-100 hover:bg-opacity-10 dark:hover:bg-slate-800 dark:hover:bg-opacity-10"
        key={option.name}
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
        icon="down"
      />
      {optionGroups?.length ? (
        <ul
          className={`absolute right-0 top-[100%] w-60 shadow-md ${
            isOpen ? 'max-h-[15rem]' : 'max-h-0'
          } overflow-auto bg-button text-button-text`}
        >
          {optionGroups.map((group) => (
            <li className="px-2 py-1" key={group.name}>
              <p className="font-bold">{group.name}</p>
              <ul>{renderOptions(group.options)}</ul>
            </li>
          ))}
        </ul>
      ) : options ? (
        <ul
          className={`absolute right-0 top-[100%] w-60 rounded-lg shadow-md ${
            isOpen ? 'max-h-[15rem]' : 'max-h-0'
          } overflow-auto bg-button text-button-text`}
        >
          {renderOptions(options)}
        </ul>
      ) : null}
    </div>
  );
};

export default ActionButtonWithOptions;
