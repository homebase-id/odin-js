import { FC, ReactNode, useState } from 'react';
import type { ActionButtonState } from './util';
import { ButtonColors } from './ColorConfig';
import { ConfirmDialogProps, ConfirmDialog } from '../../dialogs';
import { Check } from '../Icons/Check';
import { Exclamation } from '../Icons/Exclamation';
import { Loader } from '../Icons/Loader';
import { IconProps } from '../Icons/Types';

export interface ActionButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  className?: string;
  icon?: FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionButtonState;
  isDisabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>, skipNextTime?: boolean) => void;
  title?: string;
  size?: 'large' | 'small' | 'square' | 'none';
  confirmOptions?: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
}

export const ActionButton: FC<ActionButtonProps> = ({
  children,
  onClick,
  className,
  icon,
  type,
  state,
  size,
  confirmOptions,
  isDisabled,
  ...buttonProps
}) => {
  const Icon = (props: { className: string }) => {
    if (state === 'loading' || state === 'pending') return <Loader {...props} />;
    if (state === 'success') return <Check {...props} />;
    if (state === 'error') return <Exclamation {...props} />;

    return icon ? icon(props) : null;
  };

  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [mouseEvent, setMouseEvent] = useState<React.MouseEvent<HTMLElement>>();

  const colorClasses =
    (state === 'error'
      ? ButtonColors.error
      : type === 'secondary'
        ? ButtonColors.secondary
        : type === 'remove'
          ? ButtonColors.remove
          : type === 'mute'
            ? ButtonColors.mute
            : ButtonColors.primary) + (isDisabled ? ` ${ButtonColors.disabledSuffix}` : '');

  const widthClasses =
    children && type !== 'mute' && size !== 'square'
      ? `${className && className?.indexOf('w-') !== -1 ? '' : 'w-full sm:w-auto'}`
      : '';

  const sizeClasses =
    size === 'large'
      ? 'px-5 py-3'
      : size === 'small'
        ? 'px-3 py-1 text-sm'
        : size === 'square'
          ? 'p-2'
          : size === 'none'
            ? ''
            : 'px-3 py-2';

  const stateClasses = state === 'loading' || state === 'pending' ? 'animate-pulse' : '';

  return (
    <>
      <button
        className={`${
          className && (className.indexOf('absolute') !== -1 || className.indexOf('fixed') !== -1)
            ? ''
            : 'relative'
        } flex flex-row items-center ${
          className && className.indexOf('rounded-') !== -1 ? '' : 'rounded-md'
        } text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${stateClasses} ${className}`}
        disabled={isDisabled || state === 'loading' || state === 'pending'}
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
        }
        {...buttonProps}
      >
        {children}
        <Icon className={`my-auto ${children ? 'ml-2' : ''} h-5 w-5`} />
      </button>
      {confirmOptions && onClick && needsConfirmation ? (
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
