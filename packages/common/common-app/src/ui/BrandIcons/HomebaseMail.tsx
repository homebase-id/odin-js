import { FC } from 'react';
import { IconProps } from '../Icons/Types';

export const HomebaseMail: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="919"
      height="919"
      viewBox="0 0 919 919"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <rect y="0.000488281" width="919" height="919" rx="80" fill="url(#paint0_linear_416_2)" />
      <path
        d="M248.75 265.001C221.836 265.001 200 286.837 200 313.751C200 329.087 207.211 343.509 219.5 352.751L440.5 518.501C452.078 527.134 467.922 527.134 479.5 518.501L700.5 352.751C712.789 343.509 720 329.087 720 313.751C720 286.837 698.164 265.001 671.25 265.001H248.75ZM200 378.751V590.001C200 625.853 229.148 655.001 265 655.001H655C690.852 655.001 720 625.853 720 590.001V378.751L499 544.501C475.844 561.868 444.156 561.868 421 544.501L200 378.751Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_416_2"
          x1="795.951"
          y1="986.767"
          x2="375.677"
          y2="-58.4078"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.265" stopColor="#191272" />
          <stop offset="1" stopColor="#ED0342" />
        </linearGradient>
      </defs>
    </svg>
  );
};
