import { IconProps } from '@youfoundation/common-app';
import { FC, ReactNode } from 'react';
import { HybridLink } from './HybridLink';

import { ButtonColors } from './ColorConfig';
export type ActionLinkState = 'loading' | 'success' | 'error' | 'idle';

type ActionLinkProps = {
  children?: ReactNode;
  className?: string;
  type?: 'primary' | 'secondary' | 'remove' | 'mute' | 'none';
  title?: string;
  size?: 'large' | 'small' | 'square' | 'none';
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
  const Icon = (props: { className: string }) => (icon ? icon(props) : null);
  const colorClasses =
    type === 'secondary'
      ? ButtonColors.secondary
      : type === 'remove'
        ? ButtonColors.remove
        : type === 'mute'
          ? ButtonColors.mute
          : ButtonColors.primary;

  const widthClasses =
    children && type !== 'mute'
      ? `${className?.indexOf('w-') !== -1 ? '' : 'w-full sm:w-auto'}`
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

  return (
    <HybridLink
      className={`relative flex flex-row items-center rounded-md text-left ${
        onClick ? 'cursor-pointer' : ''
      } ${widthClasses} ${sizeClasses} ${colorClasses} ${className}`}
      download={download}
      href={href}
      title={title}
      onClick={onClick}
      target={target}
      rel={rel}
    >
      {children}
      <Icon className={`my-auto ${children ? 'ml-2' : ''} h-5 w-5`} />
    </HybridLink>
  );
};
