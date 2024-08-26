import { FC, ReactNode } from 'react';

import { Check, Exclamation, IconProps, Loader } from '@youfoundation/common-app/icons';
import { config } from '../../../app/config';
export type ActionButtonState = 'loading' | 'pending' | 'success' | 'error' | 'idle';

export interface ActionButtonProps {
  children?: ReactNode;
  className?: string;
  icon?: FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionButtonState;
  isDisabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  title?: string;
  size?: 'large' | 'small' | 'square';
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
  isDisabled,
}) => {
  const Icon = (props: { className: string }) => {
    if (state === 'loading' || state === 'pending') return <Loader {...props} />;
    if (state === 'success') return <Check {...props} />;
    if (state === 'error') return <Exclamation {...props} />;

    return icon ? icon(props) : null;
  };

  const colorClasses =
    (state === 'error'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : type === 'secondary'
        ? config.secondaryClassName
        : type === 'remove'
          ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
          : type === 'mute'
            ? ''
            : config.primaryClassName) + (isDisabled ? ' opacity-50 cursor-not-allowed' : '');

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
          : 'px-3 py-2';

  const stateClasses = state === 'loading' || state === 'pending' ? 'animate-pulse' : '';

  return (
    <>
      <button
        className={`${
          className && className.indexOf('absolute') !== -1 ? '' : 'relative'
        } flex flex-row ${
          className && className.indexOf('rounded-') !== -1 ? '' : 'rounded-md'
        } text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${stateClasses} ${className}`}
        disabled={isDisabled || state === 'loading' || state === 'pending'}
        onClick={onClick}
        title={title}
      >
        {children}
        <Icon className={`my-auto ${children ? 'ml-1' : ''} h-5 w-5`} />
      </button>
    </>
  );
};

export default ActionButton;
