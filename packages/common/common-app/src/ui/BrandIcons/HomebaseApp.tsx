import { FC, useId } from 'react';
import { IconProps } from '../Icons/Types';

// The Homebase app's icon, ported from chat-kmp's icons/homebase_logo_rounded.svg with the
// viewBox cropped to the tile. The gradient id is per instance: the sidenav renders this twice,
// and a gradient whose defs sit in a display:none copy does not paint in the visible one.
export const HomebaseApp: FC<IconProps> = ({ className }) => {
  const gradientId = `homebaseTile${useId().replace(/:/g, '')}`;

  return (
    <svg viewBox="72 72 288 288" xmlns="http://www.w3.org/2000/svg" className={`${className}`}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="299.9"
          y1="324.8"
          x2="-82.0"
          y2="-170.2"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#415A84" />
          <stop offset="0.2" stopColor="#4F4D89" />
          <stop offset="0.3" stopColor="#58458D" />
          <stop offset="0.5" stopColor="#5B438E" />
          <stop offset="0.7" stopColor="#57458C" />
          <stop offset="0.8" stopColor="#534A8B" />
          <stop offset="1" stopColor="#425985" />
        </linearGradient>
      </defs>
      <rect x="72" y="72" width="288" height="288" rx="64.4" fill={`url(#${gradientId})`} />
      <g transform="translate(138.6,115.9) scale(0.09089,0.09096)" fill="#FFFFFF">
        <path d="M1417.9 567.5C1574.47 567.5 1701.4 440.573 1701.4 284C1701.4 127.427 1574.47 0.5 1417.9 0.5C1261.33 0.5 1134.4 127.427 1134.4 284C1134.4 440.573 1261.33 567.5 1417.9 567.5Z" />
        <path d="M1417.9 816.9H851C694.4 816.9 567.5 690 567.5 533.4V284C567.5 127.4 440.6 0.5 284 0.5C127.4 0.5 0.5 127.4 0.5 284V1916.8C0.5 2073.4 127.4 2200.3 284 2200.3C440.6 2200.3 567.5 2073.4 567.5 1916.8V1383.9C567.7 1227.5 694.5 1100.7 851 1100.7C1007.5 1100.7 1134.3 1227.5 1134.5 1383.9V1916.8C1134.5 2073.4 1261.4 2200.3 1418 2200.3C1574.6 2200.3 1701.5 2073.4 1701.5 1916.8V1100.4C1701.5 943.8 1574.6 816.9 1418 816.9H1417.9Z" />
      </g>
    </svg>
  );
};
