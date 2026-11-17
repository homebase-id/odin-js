import { FC, ReactNode } from 'react';
import { HybridLink } from '@homebase-id/common-app';
import { IconProps } from '@homebase-id/common-app/icons';

const CardLink = ({
  className,
  isDisabled,
  href,
  title,
  description,
  children,
  icon: Icon,
}: {
  className?: string;
  isDisabled?: boolean;
  href?: string;
  title?: string | ReactNode;
  description?: string;
  children?: ReactNode;
  icon?: FC<IconProps>;
}) => {
  return (
    <HybridLink
      href={href}
      className={`flex h-full flex-col rounded-md border border-opacity-60 bg-background transition-colors hover:shadow-md ${
        className ?? ''
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      <div
        className={`flex flex-row ${
          description || children ? '' : 'flex-grow'
        } items-center bg-surface-container-high p-4`}
      >
        <h2 className="flex flex-grow text-xl">{title}</h2>
        {Icon && <Icon className="ml-auto h-4 w-4" />}
      </div>
      {description || children ? (
        <div className="flex flex-grow flex-col p-4">
          <p>{description}</p>
          {children}
        </div>
      ) : null}
    </HybridLink>
  );
};

export default CardLink;
