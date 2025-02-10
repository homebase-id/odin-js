import { FC, ReactNode, useMemo, useState } from 'react';
import type { ActionButtonState } from './util';
import { ButtonColors } from './ColorConfig';
import { ConfirmDialogProps, ConfirmDialog } from '../../dialogs';
import { Check } from '../Icons/Check';
import { Exclamation } from '../Icons/Exclamation';
import { Loader } from '../Icons/Loader';
import { IconProps } from '../Icons/Types';

export interface PureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  className?: string;
  icon?: FC<IconProps>;
}

export interface ConfirmableButtonProps extends Omit<StyledButtonProps, 'onClick'> {
  confirmOptions: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;

  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, skipNextTime?: boolean) => void;
}

export interface StyledButtonProps extends Omit<Omit<PureButtonProps, 'type'>, 'onClick'> {
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionButtonState;

  size?: 'square' | 'none';
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, skipNextTime?: boolean) => void;
}

export type ActionButtonProps = StyledButtonProps | ConfirmableButtonProps;

export const ActionButton = (props: StyledButtonProps | ConfirmableButtonProps) => {
  if ('confirmOptions' in props && props.confirmOptions) {
    return <ConfirmableButton {...props} />;
  } else {
    return <StyledButton {...(props as StyledButtonProps)} />;
  }
};

const ConfirmableButton = ({ confirmOptions, onClick, ...props }: ConfirmableButtonProps) => {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [mouseEvent, setMouseEvent] = useState<React.MouseEvent<HTMLButtonElement>>();

  return (
    <>
      <StyledButton
        {...props}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          setNeedsConfirmation(true);
          setMouseEvent(e);
          return false;
        }}
      />
      {needsConfirmation ? (
        <ConfirmDialog
          {...confirmOptions}
          onConfirm={(_e, skipNextTime) => {
            setNeedsConfirmation(false);
            onClick && mouseEvent && onClick(mouseEvent, skipNextTime);
          }}
          onCancel={() => setNeedsConfirmation(false)}
        />
      ) : null}
    </>
  );
};

const StyledButton = ({
  type,
  state,
  icon,
  size,
  className,
  confirmOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
  ...buttonProps
}: { confirmOptions: unknown } & StyledButtonProps) => {
  const hasChildren = !!buttonProps.children;
  const hasIcon = (!!state && state !== 'idle') || !!icon;

  const updatedIcon = useMemo(() => {
    if (state === 'loading' || state === 'pending') return Loader;
    if (state === 'success') return Check;
    if (state === 'error') return Exclamation;

    return icon;
  }, [state]);

  const classNames = (() => {
    const colorClasses =
      (state === 'error'
        ? ButtonColors.error
        : type === 'secondary'
          ? ButtonColors.secondary
          : type === 'remove'
            ? ButtonColors.remove
            : type === 'mute'
              ? ButtonColors.mute
              : ButtonColors.primary) +
      (buttonProps.disabled ? ` ${ButtonColors.disabledSuffix}` : '');

    const widthClasses =
      hasChildren && type !== 'mute' && size !== 'square'
        ? `${className && className?.indexOf('w-') !== -1 ? undefined : 'w-full sm:w-auto'}`
        : undefined;

    const sizeClasses =
      size === 'square'
        ? 'p-2'
        : size === 'none'
          ? undefined
          : `px-4 py-2 ${hasIcon && hasChildren ? 'pr-3' : undefined}`;

    const stateClasses = state === 'loading' || state === 'pending' ? 'animate-pulse' : undefined;

    const positionClassName =
      className && (className.indexOf('absolute') !== -1 || className.indexOf('fixed') !== -1)
        ? undefined
        : 'relative';
    const flexClassName = 'flex flex-row items-center';
    const roundedClassName =
      className && className.indexOf('rounded-') !== -1 ? undefined : 'rounded-md';
    const baseTextClassName = 'text-left';

    return [
      positionClassName,
      flexClassName,
      roundedClassName,
      baseTextClassName,
      widthClasses,
      sizeClasses,
      colorClasses,
      stateClasses,
      className,
    ];
  })();

  return <PureButton {...buttonProps} className={classNames.join(' ')} icon={updatedIcon} />;
};

const PureButton = ({ children, icon, ...props }: PureButtonProps) => {
  const hasChildren = !!children;

  return (
    <button {...props}>
      {children}
      {icon && icon({ className: `my-auto ${hasChildren ? 'ml-2' : ''} h-5 w-5` })}
    </button>
  );
};
