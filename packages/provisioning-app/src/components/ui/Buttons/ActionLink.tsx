import { FC, ReactNode } from 'react';

import { config } from '../../../app/config';
import { IconProps } from '@youfoundation/common-app';

export type ActionLinkState = 'loading' | 'success' | 'error' | 'idle';

type ActionLinkProps = {
  children?: ReactNode;
  className?: string;
  icon?: FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionLinkState;
  title?: string;
  size?: 'large' | 'small';
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;

  download?: string;
  href?: string;
};

const ActionLink: FC<ActionLinkProps> = ({
  children,
  className,
  icon,
  type,
  state,
  title,
  size,
  onClick,

  download,
  href,
}) => {
  const Icon = (props: { className: string }) => (icon ? icon(props) : null);
  const colorClasses =
    state === 'error'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : type === 'secondary'
      ? config.secondaryClassName
      : type === 'remove'
      ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
      : type === 'mute'
      ? ''
      : config.primaryClassName;

  const widthClasses =
    children && type !== 'mute'
      ? `min-w-[6rem] ${className?.indexOf('w-full') ? '' : 'w-full sm:w-auto'}`
      : '';

  const sizeClasses =
    size === 'large' ? 'px-5 py-3' : size === 'small' ? 'px-3 py-1 text-sm' : 'px-3 py-2';

  const stateClasses = state === 'loading' ? 'animate-pulse' : '';

  return (
    <>
      <a
        className={`relative flex flex-row rounded-md text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${stateClasses} ${className}`}
        download={download}
        href={href}
        title={title}
        onClick={onClick}
      >
        {children && <span className="mr-1">{children}</span>}
        <Icon className={'my-auto ml-auto h-4 w-4'} />
      </a>
    </>
  );
};

export default ActionLink;
