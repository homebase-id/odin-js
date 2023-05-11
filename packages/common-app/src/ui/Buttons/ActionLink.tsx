import {
  IconProps,
  Save,
  Arrow,
  Plus,
  Trash,
  Pencil,
  Shield,
  Check,
  Times,
} from '@youfoundation/common-app';
import { FC, ReactNode } from 'react';

export type ActionLinkState = 'loading' | 'success' | 'error' | 'idle';

type ActionLinkProps = {
  children?: ReactNode;
  className?: string;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  title?: string;
  size?: 'large' | 'small' | 'square';
  onClick?: (e: unknown) => void;
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
  download?: string;
  href?: string;
};

export const ActionLink: FC<ActionLinkProps> = ({
  children,
  className,
  type,
  title,
  size,
  onClick,
  icon,
  download,
  href,
}) => {
  const Icon = (props: { className: string }) => {
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

  const colorClasses =
    type === 'secondary'
      ? 'bg-secondary text-secondary-contrast hover:filter hover:brightness-90'
      : type === 'remove'
      ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
      : type === 'mute'
      ? ''
      : 'bg-primary text-primary-contrast hover:filter hover:brightness-90';

  const widthClasses =
    children && type !== 'mute'
      ? `min-w-[6rem] ${className?.indexOf('w-') !== -1 ? '' : 'w-full sm:w-auto'}`
      : '';

  const sizeClasses =
    size === 'large'
      ? 'px-5 py-3'
      : size === 'small'
      ? 'px-3 py-1 text-sm'
      : size === 'square'
      ? 'p-2'
      : 'px-3 py-2';

  return (
    <a
      className={`relative flex flex-row items-center rounded-md text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${className}`}
      download={download}
      href={href}
      title={title}
      onClick={onClick}
    >
      {children}
      <Icon className={`my-auto ${children ? 'ml-2' : ''} h-4 w-4`} />
    </a>
  );
};
