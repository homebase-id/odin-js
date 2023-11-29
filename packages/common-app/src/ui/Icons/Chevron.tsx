import { FC } from 'react';

import { IconProps } from './Types';

export const Chevron: FC<IconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      viewBox="0 0 320 512"
      className={className}
      fill="currentColor"
    >
      <path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
    </svg>
  );
};

export const ChevronUp: FC<IconProps> = ({ className }) => {
  return <Chevron className={`-rotate-90 ${className ?? ''}`} />;
};

export const ChevronDown: FC<IconProps> = ({ className }) => {
  return <Chevron className={`rotate-90 ${className ?? ''}`} />;
};

export const ChevronLeft: FC<IconProps> = ({ className }) => {
  return <Chevron className={`rotate-180 ${className ?? ''}`} />;
};
