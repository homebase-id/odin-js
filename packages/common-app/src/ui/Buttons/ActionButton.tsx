import { FC, ReactNode, useState } from 'react';
import { ConfirmDialog, ConfirmDialogProps } from '@youfoundation/common-app';
import { IconProps, Loader, Check, Exclamation } from '@youfoundation/common-app';

export type ActionButtonState = 'pending' | 'loading' | 'success' | 'error' | 'idle';
import { ButtonColors } from './ColorConfig';

export interface ActionButtonProps {
  children?: ReactNode;
  className?: string;
  icon?: FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionButtonState;
  isDisabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  title?: string;
  size?: 'large' | 'small' | 'square' | 'none';
  confirmOptions?: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
}

export const mergeStates = (
  stateA: ActionButtonState,
  stateB: ActionButtonState
): ActionButtonState => {
  if (stateA === 'error' || stateB === 'error') return 'error';
  if (stateA === 'pending' || stateB === 'pending') return 'pending';
  if (stateA === 'loading' || stateB === 'loading') return 'loading';
  if (stateA === 'idle' && stateB === 'idle') return 'idle';
  if (stateA === 'success' && stateB === 'success') return 'success';
  if ((stateA === 'success' && stateB === 'idle') || (stateA === 'idle' && stateB === 'success'))
    return 'success';

  return 'idle';
};

export const ActionButton: FC<ActionButtonProps> = ({
  children,
  onClick,
  className,
  icon,
  type,
  state,
  title,
  size,
  confirmOptions,
  isDisabled,
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
      ? `${className?.indexOf('w-full') !== -1 ? '' : 'w-full sm:w-auto'}`
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
        title={title}
      >
        {children}
        <Icon className={`my-auto ${children ? 'ml-2' : ''} h-4 w-4`} />
      </button>
      {confirmOptions && onClick && needsConfirmation ? (
        <ConfirmDialog
          {...confirmOptions}
          onConfirm={() => {
            setNeedsConfirmation(false);
            onClick && mouseEvent && onClick(mouseEvent);
          }}
          onCancel={() => setNeedsConfirmation(false)}
        />
      ) : null}
    </>
  );
};
