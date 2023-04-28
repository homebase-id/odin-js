import { FC, ReactNode, useState } from 'react';
import ConfirmDialog from '../../Dialog/ConfirmDialog/ConfirmDialog';
import {
  IconProps,
  Loader,
  Check,
  Exclamation,
  Save,
  Arrow,
  Plus,
  Trash,
  Pencil,
  Shield,
  Times,
} from '@youfoundation/common-app';

export type ActionButtonState = 'loading' | 'success' | 'error' | 'idle';

export interface ActionButtonProps {
  children?: ReactNode;
  className?: string;
  icon?:
    | 'save'
    | 'send'
    | 'plus'
    | 'trash'
    | 'edit'
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'shield'
    | 'check'
    | 'times'
    | FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionButtonState;
  isDisabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  title?: string;
  size?: 'large' | 'small' | 'square' | 'none';
  confirmOptions?: {
    title: string;
    buttonText: string;
    body: string;
  };
}

const ActionButton: FC<ActionButtonProps> = ({
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
    if (state === 'loading') {
      return <Loader {...props} />;
    }
    if (state === 'success') {
      return <Check {...props} />;
    }
    if (state === 'error') {
      return <Exclamation {...props} />;
    }

    return icon === 'save' ? (
      <Save {...props} />
    ) : icon === 'send' ? (
      <Arrow {...props} />
    ) : icon === 'plus' ? (
      <Plus {...props} />
    ) : icon === 'trash' ? (
      <Trash {...props} />
    ) : icon === 'edit' ? (
      <Pencil {...props} />
    ) : icon === 'left' ? (
      <Arrow {...props} className={`-rotate-180 ${props.className}`} />
    ) : icon === 'right' ? (
      <Arrow {...props} className={` ${props.className}`} />
    ) : icon === 'up' ? (
      <Arrow {...props} className={`-rotate-90 ${props.className}`} />
    ) : icon === 'shield' ? (
      <Shield {...props} fill="currentColor" />
    ) : icon === 'down' ? (
      <Arrow {...props} className={`rotate-90 ${props.className}`} />
    ) : icon === 'check' ? (
      <Check {...props} className={`${props.className}`} />
    ) : icon === 'times' ? (
      <Times {...props} className={`${props.className}`} />
    ) : icon ? (
      icon(props)
    ) : null;
  };

  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const colorClasses =
    (state === 'error'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : type === 'secondary'
      ? 'border-button border-2 hover:bg-button hover:text-button-text'
      : type === 'remove'
      ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
      : type === 'mute'
      ? ''
      : 'bg-button hover:filter hover:grayscale-[20%] text-button-text') +
    (isDisabled ? ' opacity-50 cursor-not-allowed' : '');

  const widthClasses =
    children && type !== 'mute'
      ? `min-w-[6rem] ${className?.indexOf('w-full') ? '' : 'w-full sm:w-auto'}`
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

  const stateClasses = state === 'loading' ? 'animate-pulse' : '';

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
        disabled={isDisabled || state === 'loading'}
        onClick={
          confirmOptions
            ? (e) => {
                e.preventDefault();
                setNeedsConfirmation(true);
                return false;
              }
            : onClick
        }
        title={title}
      >
        {children}
        <Icon className={`my-auto ${children ? 'ml-2' : ''} h-4 w-4`} />
      </button>
      {confirmOptions && onClick && (
        <ConfirmDialog
          title={confirmOptions.title}
          confirmText={confirmOptions.buttonText}
          needConfirmation={needsConfirmation}
          onConfirm={onClick}
          onCancel={() => setNeedsConfirmation(false)}
        >
          <p className="text-sm">{confirmOptions.body}</p>
        </ConfirmDialog>
      )}
    </>
  );
};

export default ActionButton;
