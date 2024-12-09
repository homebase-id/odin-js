import { FC, ReactNode } from 'react';
import { HybridLink, HybridLinkProps } from './HybridLink';

import { ButtonColors } from './ColorConfig';
import { IconProps } from '../Icons/Types';

export interface ActionLinkProps extends Omit<HybridLinkProps, 'children'> {
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  size?: 'square' | 'none';
  icon?: FC<IconProps>;
  children?: ReactNode;
}

export const ActionLink: FC<ActionLinkProps> = ({
  children,
  type,
  icon,
  size,
  className,
  ...linkProps
}) => {
  const hasChildren = !!children;
  const hasIcon = !!icon;

  const classNames = (() => {
    const colorClasses =
      type === 'secondary'
        ? ButtonColors.secondary
        : type === 'remove'
          ? ButtonColors.remove
          : type === 'mute'
            ? ButtonColors.mute
            : ButtonColors.primary;

    const widthClasses =
      hasChildren && type !== 'mute' && size !== 'square'
        ? `${className && className?.indexOf('w-') !== -1 ? undefined : 'w-full sm:w-auto'}`
        : undefined;

    const sizeClasses =
      size === 'square'
        ? 'p-2'
        : size === 'none'
          ? undefined
          : `px-3 py-2 ${hasIcon && hasChildren ? 'pl-4' : undefined}`;

    const clickClassName = 'cursor-pointer';

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
      clickClassName,
      className,
    ];
  })();
  return (
    <HybridLink className={classNames.join(' ')} {...linkProps}>
      {children}
      {icon && icon({ className: `my-auto ${hasChildren ? 'ml-2' : ''} h-5 w-5` })}
    </HybridLink>
  );
};
