import { FC, useRef, useState } from 'react';
import {
  ActionButton,
  ActionButtonProps,
  ConfirmDialogProps,
  Ellipsis,
  FakeAnchor,
  t,
  useMostSpace,
} from '@youfoundation/common-app';
import { ConfirmDialog } from '@youfoundation/common-app';

import { IconProps, useOutsideTrigger } from '@youfoundation/common-app';

export interface ActionGroupOptionProps {
  icon?: FC<IconProps>;
  label: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  href?: string;
  confirmOptions?: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
}

export interface ActionGroupProps extends Omit<ActionButtonProps, 'onClick'> {
  buttonClassName?: string;
  options: ActionGroupOptionProps[];
}

export const ActionGroup = ({
  options,
  className,
  children,
  buttonClassName,
  ...actionButtonProps
}: ActionGroupProps) => {
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  const [isOpen, setIsOpen] = useState(false);

  if (!options.length) return null;

  return (
    <div
      className={`${className?.includes('absolute') ? '' : 'relative'} ${className ?? ''}`}
      ref={wrapperRef}
    >
      <ActionButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`group ${buttonClassName || ''}`}
        {...actionButtonProps}
      >
        {children ? (
          children
        ) : (
          <>
            <Ellipsis className="opacity-50 group-hover:opacity-100 w-5 h-5" />
            <span className="sr-only ml-1">{t('More')}</span>
          </>
        )}
      </ActionButton>
      <div
        className={`absolute ${horizontalSpace === 'left' ? 'right-0' : 'left-0'} ${
          verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
        } z-20 w-[12rem] ${
          isOpen ? 'max-h-[15rem] border' : 'max-h-0'
        } overflow-auto rounded-md border-gray-200 border-opacity-80 shadow-md dark:border-gray-700`}
      >
        <ul className={`block`}>
          {options.map((option) => {
            return (
              <ActionOption
                {...option}
                onClick={(e) => {
                  setIsOpen(false);
                  option.onClick && option.onClick(e);
                }}
                key={option.label}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const ActionOption = ({ icon, label, onClick, href, confirmOptions }: ActionGroupOptionProps) => {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [mouseEvent, setMouseEvent] = useState<React.MouseEvent<HTMLElement> | null>();

  return (
    <>
      <li className="text-foreground bg-background cursor-pointer text-base hover:bg-slate-200 dark:hover:bg-slate-700">
        <FakeAnchor
          href={href}
          onClick={
            confirmOptions
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNeedsConfirmation(true);
                  setMouseEvent(e);
                  return false;
                }
              : onClick
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick(e);
                }
              : undefined
          }
          className="flex w-full flex-row px-2 py-1"
        >
          {icon && icon({ className: 'h-4 w-4 my-auto mr-2 flex-shrink-0' })}
          <span className={''}>{label}</span>
        </FakeAnchor>
      </li>
      {confirmOptions && onClick && needsConfirmation ? (
        <ConfirmDialog
          {...confirmOptions}
          onConfirm={() => {
            if (!mouseEvent) return;
            setNeedsConfirmation(false);
            onClick(mouseEvent);
          }}
          onCancel={(e) => {
            setNeedsConfirmation(false);
          }}
        />
      ) : null}
    </>
  );
};
