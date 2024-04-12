import { FC, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ActionButtonProps,
  ConfirmDialogProps,
  Ellipsis,
  FakeAnchor,
  t,
  useMostSpace,
  usePortal,
} from '@youfoundation/common-app';
import { ConfirmDialog } from '@youfoundation/common-app';

import { IconProps, useOutsideTrigger } from '@youfoundation/common-app';

export interface ActionGroupOptionProps {
  icon?: FC<IconProps>;
  label: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  href?: string;
  confirmOptions?: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
  className?: string;
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
  const isSm = document.documentElement.clientWidth < 768;
  const target = usePortal('action-group');

  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => !isSm && setIsOpen(false));
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  const [isOpen, setIsOpen] = useState(false);
  if (!options.length) return null;

  const ActionOptions = (
    <div
      className={`${horizontalSpace === 'left' ? 'right-0' : 'left-0'} ${
        verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
      } z-20 ${isOpen ? 'max-h-[15rem] border' : 'max-h-0'} ${
        isSm ? 'w-full' : 'absolute w-[14rem]'
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
        <ActionOption onClick={() => setIsOpen(false)} label={'Close'} className="md:hidden" />
      </ul>
    </div>
  );

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
        {children || (
          <>
            <Ellipsis className="opacity-50 group-hover:opacity-100 w-5 h-5" />
            <span className="sr-only ml-1">{t('More')}</span>
          </>
        )}
      </ActionButton>
      {isSm
        ? isOpen
          ? createPortal(
              <div
                className={
                  isOpen
                    ? 'bg-background/70 z-20 px-4 fixed inset-0 flex flex-col items-center justify-center lg:contents'
                    : 'fixed lg:contents'
                }
                onClick={() => setIsOpen(false)}
              >
                {ActionOptions}
              </div>,
              target
            )
          : null
        : ActionOptions}
    </div>
  );
};

const ActionOption = ({
  icon,
  label,
  onClick,
  href,
  confirmOptions,
  className,
}: ActionGroupOptionProps) => {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [mouseEvent, setMouseEvent] = useState<React.MouseEvent<HTMLElement> | null>();

  return (
    <>
      <li
        className={`text-foreground bg-background cursor-pointer text-base hover:bg-slate-200 dark:hover:bg-slate-700 ${
          className || ''
        }`}
      >
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
          className="flex w-full flex-row px-5 py-3 md:px-3 md:py-2"
        >
          {icon && icon({ className: 'h-5 w-5 my-auto mr-2 flex-shrink-0' })}
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
          onCancel={() => setNeedsConfirmation(false)}
        />
      ) : null}
    </>
  );
};
