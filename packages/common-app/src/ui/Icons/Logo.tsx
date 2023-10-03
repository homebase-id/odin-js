import { FC } from 'react';
import { IconProps } from './Types';

export const Logo: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="919"
      height="919"
      viewBox="0 0 919 919"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <circle cx="459.5" cy="459.5" r="439.5" stroke="url(#paint0_linear_403_4)" strokeWidth="40" />
      <path
        d="M698.625 490.339C698.592 482.031 705.317 475.278 713.625 475.278H752C760.284 475.278 767 468.562 767 460.278V425.69C767 421.505 765.251 417.51 762.177 414.671L470.589 145.385C464.848 140.084 455.999 140.078 450.251 145.371L157.838 414.669C154.755 417.509 153 421.51 153 425.703V460.278C153 468.562 159.716 475.278 168 475.278H206.329C214.613 475.278 221.329 481.994 221.329 490.278V725C221.329 733.284 228.045 740 236.329 740H376.778C385.062 740 391.778 733.284 391.778 725V566.25C391.778 557.966 398.494 551.25 406.778 551.25H513.222C521.506 551.25 528.222 557.966 528.222 566.25V725C528.222 733.284 534.938 740 543.222 740H684.57C692.878 740 699.603 733.247 699.57 724.94L698.625 490.339Z"
        fill="url(#paint1_linear_403_4)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_403_4"
          x1="459.5"
          y1="0"
          x2="459.5"
          y2="919"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C68CFF" />
          <stop offset="1" stopColor="#8CD9FF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_403_4"
          x1="613.242"
          y1="274.057"
          x2="309.406"
          y2="561.747"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C68CFF" />
          <stop offset="1" stopColor="#8CD9FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
