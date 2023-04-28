import { FC } from 'react';

import { IconProps } from '../Types';

export const Minecraft: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="605"
      height="605"
      viewBox="0 0 605 605"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0H605V605H0V0ZM248.571 460.357H195V297.5H249.286V243.571H358.929V297.143H412.857V459.643H357.857V406.786H248.571V460.357ZM358.929 243.571H467.857V134.643H358.929V243.571ZM140 243.571H249.286V134.643H140V243.571Z"
        fill="currentColor"
      />
    </svg>
  );
};
