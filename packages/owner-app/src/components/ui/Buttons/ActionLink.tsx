import { FC, ReactNode } from 'react';

import Arrow from '../Icons/Arrow/Arrow';
import Check from '../Icons/Check/Check';
import Exclamation from '../Icons/Exclamation/Exclamation';
import Loader from '../Icons/Loader/Loader';
import Pencil from '../Icons/Pencil/Pencil';
import Plus from '../Icons/Plus/Plus';
import Save from '../Icons/Save/Save';
import Shield from '../Icons/Shield/Shield';
import Trash from '../Icons/Trash/Trash';
import HybridLink from './HybridLink';

export type ActionLinkState = 'loading' | 'success' | 'error' | 'idle';

type ActionLinkProps = {
  children?: ReactNode;
  className?: string;
  icon?: 'save' | 'send' | 'plus' | 'trash' | 'edit' | 'up' | 'down' | 'shield' | FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  state?: ActionLinkState;
  title?: string;
  size?: 'large' | 'small' | 'square';
  onClick?: (e) => void;

  download?: string;
  href?: string;
};

export const mergeStates = (stateA: ActionLinkState, stateB: ActionLinkState): ActionLinkState => {
  if (stateA === 'error' || stateB === 'error') {
    return 'error';
  }

  if (stateA === 'loading' || stateB === 'loading') {
    return 'loading';
  }

  if (stateA === 'idle' && stateB === 'idle') {
    return 'idle';
  }

  if (stateA === 'success' && stateB === 'success') {
    return 'success';
  }

  if ((stateA === 'success' && stateB === 'idle') || (stateA === 'idle' && stateB === 'success')) {
    return 'success';
  }
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
    ) : icon === 'up' ? (
      <Arrow {...props} className={`-rotate-90 ${props.className}`} />
    ) : icon === 'down' ? (
      <Arrow {...props} className={`rotate-90 ${props.className}`} />
    ) : icon === 'shield' ? (
      <Shield {...props} fill="currentColor" />
    ) : (
      icon && icon(props)
    );
  };

  const colorClasses =
    state === 'error'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : type === 'secondary'
      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-800 dark:text-white'
      : type === 'remove'
      ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
      : type === 'mute'
      ? ''
      : 'bg-green-500 hover:bg-green-600 text-white';

  const widthClasses =
    children && type !== 'mute' && size !== 'square'
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

  const stateClasses = state === 'loading' ? 'animate-pulse' : '';

  return (
    <>
      <HybridLink
        className={`flex flex-row rounded-md text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${stateClasses} ${className}`}
        download={download}
        href={href}
        title={title}
        onClick={onClick}
      >
        {children && <span className="mr-1">{children}</span>}
        <Icon className={'my-auto ml-auto h-4 w-4'} />
      </HybridLink>
    </>
  );
};

export default ActionLink;
