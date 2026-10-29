import { FC, useId } from 'react';
import { IconProps } from '../Icons/Types';

// Homebase File sync's icon, ported from the icon.svg its releases ship (homebase-id/filesync).
// The gradient id is per instance, as in HomebaseApp.
export const HomebaseFileSync: FC<IconProps> = ({ className }) => {
  const gradientId = `homebaseFileSync${useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={`${className}`}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5b438e" />
          <stop offset=".55" stopColor="#57458c" />
          <stop offset="1" stopColor="#396281" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12.4" fill={`url(#${gradientId})`} />
      <g transform="translate(17 21.1) scale(.825) translate(-14 -8)" fill="#fff">
        <rect x="14" y="50" width="66" height="28" rx="14" />
        <circle cx="32" cy="52" r="14" />
        <circle cx="52" cy="44" r="20" />
        <circle cx="68" cy="56" r="12" />
        <circle cx="83" cy="19" r="11" />
      </g>
    </svg>
  );
};
