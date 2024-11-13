import { FC } from 'react';

import { IconProps } from './Types';

export const PaperPlane: FC<IconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
      viewBox="0 0 512 512"
    >
      <path d="M83.4 226.6L304 256 83.4 285.4 0 480H64L512 256 64 32H0L83.4 226.6z" />
    </svg>
  );
};
