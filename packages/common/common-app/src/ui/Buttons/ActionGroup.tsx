import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialogProps, ConfirmDialog, OptionDialogProps, OptionDialog } from '../../dialogs';
import { t } from '../../helpers';
import { usePortal, useOutsideTrigger, useMostSpace } from '../../hooks';
import { Ellipsis } from '../Icons/Ellipsis';
import { IconProps } from '../Icons/Types';
import { ActionButtonProps, ActionButton } from './ActionButton';
import { FakeAnchor } from './FakeAnchor';

export interface ActionGroupOptionPropsBase {
  icon?: FC<IconProps>;
  label: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  href?: string;

  className?: string;
}

export interface ActionGroupOptionPropsWithConfirmation extends ActionGroupOptionPropsBase {
  confirmOptions?: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
}

export interface ActionGroupOptionPropsWithOptions extends ActionGroupOptionPropsBase {
  onClick: undefined;
  actionOptions?: Omit<OptionDialogProps, 'onCancel'>;
}

export type ActionGroupOptionProps =
  | ActionGroupOptionPropsWithConfirmation
  | ActionGroupOptionPropsWithOptions;

export interface ActionGroupProps extends Omit<ActionButtonProps, 'onClick'> {
  buttonClassName?: string;
  options: (ActionGroupOptionProps | undefined)[];
  alwaysInPortal?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const ActionGroup = ({
  options,
  className,
  children,
  buttonClassName,
  alwaysInPortal,
  onOpen,
  onClose,
  ...actionButtonProps
}: ActionGroupProps) => {
  const isSm = document.documentElement.clientWidth < 768;
  const target = usePortal('action-group');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => !isSm && !alwaysInPortal && setIsOpen(false));
  useOutsideTrigger([portalRef, wrapperRef], () => {
    alwaysInPortal && setIsOpen(false);
  });
  const { verticalSpace, horizontalSpace } = useMostSpace(wrapperRef);

  const [isOpen, setIsOpen] = useState(false);
  if (!options.length) return null;

  useEffect(() => {
    if (isOpen) onOpen?.();
    else onClose?.();
  }, [isOpen]);

  const ActionOptions = (
    <div
      className={`${horizontalSpace === 'left' ? 'right-0' : 'left-0'} ${
        verticalSpace === 'top' ? 'bottom-[100%]' : 'top-[100%]'
      } z-20 ${isOpen ? 'max-h-[15rem] border' : 'max-h-0'} ${
        isSm ? 'w-full' : 'absolute w-[14rem]'
      } overflow-auto rounded-md border-gray-200 border-opacity-80 shadow-md dark:border-gray-700 pointer-events-auto`}
    >
      <ul className={`block`}>
        {(options.filter(Boolean) as ActionGroupOptionProps[]).map((option) => {
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
        <ActionOption
          onClick={() => setIsOpen(false)}
          label={'Close'}
          className="text-foreground/60 md:hidden"
        />
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
                ref={portalRef}
              >
                {ActionOptions}
              </div>,
              target
            )
          : null
        : alwaysInPortal
          ? createPortal(
              <div
                style={{
                  position: 'fixed',
                  top: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().top : 0,
                  left: wrapperRef.current ? wrapperRef.current.getBoundingClientRect().left : 0,
                  width: wrapperRef.current ? wrapperRef.current.clientWidth : 0,
                  height: wrapperRef.current ? wrapperRef.current.clientHeight : 0,
                }}
                ref={portalRef}
                className={`pointer-events-none z-10 ${isOpen ? 'block' : 'hidden'}`}
              >
                {ActionOptions}
              </div>,
              target
            )
          : ActionOptions}
    </div>
  );
};

const ActionOption = ({
  icon,
  label,
  onClick,
  href,
  className,
  ...props
}: ActionGroupOptionProps) => {
  const confirmOptions = 'confirmOptions' in props ? props.confirmOptions : undefined;
  const actionOptions = 'actionOptions' in props ? props.actionOptions : undefined;

  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [needsOption, setNeedsOption] = useState(false);
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
              : actionOptions
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNeedsOption(true);
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
      {actionOptions && needsOption ? (
        <OptionDialog
          {...actionOptions}
          options={actionOptions.options.filter(Boolean).map((option) => ({
            ...option,
            onClick: () => {
              if (!mouseEvent) return;
              setNeedsOption(false);
              option?.onClick(mouseEvent);
            },
          }))}
          onCancel={() => setNeedsOption(false)}
        />
      ) : null}
    </>
  );
};
