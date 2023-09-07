import { IconProps } from '@youfoundation/common-app';
import { FC, ReactNode } from 'react';
import { HybridLink } from './HybridLink';

export type ActionLinkState = 'loading' | 'success' | 'error' | 'idle';

type ActionLinkProps = {
  children?: ReactNode;
  className?: string;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  title?: string;
  size?: 'large' | 'small' | 'square';
  onClick?: (e: unknown) => void;
  icon?: FC<IconProps>;
  download?: string;
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
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
  target,
  rel,
}) => {
  const Icon = (props: { className: string }) => {
    return icon ? icon(props) : null;
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
    <HybridLink
      className={`relative flex flex-row items-center rounded-md text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${className}`}
      download={download}
      href={href}
      title={title}
      onClick={onClick}
      target={target}
      rel={rel}
    >
      {children}
      <Icon className={`my-auto ${children ? 'ml-2' : ''} h-4 w-4`} />
    </HybridLink>
  );
};
